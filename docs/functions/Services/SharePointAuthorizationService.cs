// =============================================================================
// Legal Workflow - Azure Functions
// SharePointAuthorizationService.cs - SharePoint-based authorization service
// =============================================================================
//
// This service performs authorization checks against SharePoint:
// 1. Verifies user membership in SharePoint site groups
// 2. Verifies request ownership (submitter can only modify their own request)
//
// SharePoint Groups (from PermissionGroupConfig):
// - LW - Admin: Full system administration
// - LW - Submitters: Create and view requests
// - LW - Legal Admin: Triage and assign attorneys
// - LW - Attorney Assigner: Committee members who assign attorneys
// - LW - Attorneys: Review assigned requests
// - LW - Compliance Users: Review compliance requests
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PnP.Core.Model.SharePoint;
using PnP.Core.Services;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Service for SharePoint-based authorization checks.
    /// Validates user membership in SharePoint groups and request ownership.
    /// </summary>
    public class SharePointAuthorizationService
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly Logger _logger;
        private readonly PermissionGroupConfig _groupConfig;

        // Cache for group membership checks (per user, per request)
        private readonly Dictionary<string, UserGroupMembership> _membershipCache = new();

        /// <summary>
        /// Creates a new SharePointAuthorizationService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="groupConfig">SharePoint group name configuration</param>
        public SharePointAuthorizationService(
            IPnPContextFactory contextFactory,
            Logger logger,
            PermissionGroupConfig groupConfig)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
        }

        /// <summary>
        /// Checks if a user is authorized to perform an action on a request.
        /// </summary>
        /// <param name="userInfo">User information from the validated token</param>
        /// <param name="action">The action being performed</param>
        /// <param name="requestId">The request ID (optional, for ownership checks)</param>
        /// <returns>SharePointAuthorizationResult with authorization status</returns>
        public async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            AuthorizationAction action,
            int? requestId = null)
        {
            using var tracker = _logger.StartOperation($"Authorize({action}, RequestId={requestId})");

            try
            {
                // Get user's SharePoint group membership
                var membership = await GetUserGroupMembershipAsync(userInfo);

                if (membership == null)
                {
                    _logger.Warning($"Could not retrieve group membership for user: {userInfo.Email}");
                    return SharePointAuthorizationResult.Denied("Unable to verify user permissions");
                }

                // Check if user is in any authorized group
                if (!membership.IsInAnyGroup)
                {
                    _logger.Warning($"User {userInfo.Email} is not a member of any authorized SharePoint group");
                    return SharePointAuthorizationResult.Denied(
                        "Access denied. You must be a member of an authorized SharePoint group.");
                }

                // Perform action-specific authorization
                var result = await AuthorizeActionAsync(userInfo, membership, action, requestId);

                if (result.IsAuthorized)
                {
                    _logger.Info($"Authorization granted for {userInfo.Email} - Action: {action}");
                }
                else
                {
                    _logger.Warning($"Authorization denied for {userInfo.Email} - Action: {action} - Reason: {result.ErrorMessage}");
                }

                tracker.Complete(result.IsAuthorized);
                return result;
            }
            catch (Exception ex)
            {
                _logger.Error($"Authorization check failed for {userInfo.Email}", ex);
                tracker.Complete(false, ex.Message);
                return SharePointAuthorizationResult.Denied("Authorization check failed");
            }
        }

        /// <summary>
        /// Gets the SharePoint group membership for a user.
        /// Uses caching to avoid repeated SharePoint calls.
        /// </summary>
        private async Task<UserGroupMembership?> GetUserGroupMembershipAsync(UserAuthInfo userInfo)
        {
            var cacheKey = userInfo.Email.ToLowerInvariant();

            // Check cache first
            if (_membershipCache.TryGetValue(cacheKey, out var cachedMembership))
            {
                _logger.Info($"Using cached group membership for {userInfo.Email}");
                return cachedMembership;
            }

            using var tracker = _logger.StartOperation($"GetUserGroupMembership({userInfo.Email})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get site groups and check membership
                var siteGroups = await context.Web.SiteGroups.ToListAsync();

                var membership = new UserGroupMembership
                {
                    UserEmail = userInfo.Email,
                    UserLoginName = userInfo.SharePointLoginName
                };

                // Check each relevant group
                foreach (var group in siteGroups.AsRequested())
                {
                    var groupName = group.Title;

                    // Only check our Legal Workflow groups
                    if (!IsLegalWorkflowGroup(groupName))
                    {
                        continue;
                    }

                    // Load group members
                    await group.LoadAsync(g => g.Users);

                    // Check if user is a member
                    var isMember = group.Users.AsRequested()
                        .Any(u => u.LoginName.Equals(userInfo.SharePointLoginName, StringComparison.OrdinalIgnoreCase) ||
                                  u.Mail?.Equals(userInfo.Email, StringComparison.OrdinalIgnoreCase) == true);

                    if (isMember)
                    {
                        membership.Groups.Add(groupName);

                        // Set role flags based on group membership
                        SetRoleFlags(membership, groupName);

                        _logger.Info($"User {userInfo.Email} is member of group: {groupName}");
                    }
                }

                // Cache the result
                _membershipCache[cacheKey] = membership;

                _logger.Info($"Group membership resolved for {userInfo.Email}", new
                {
                    GroupCount = membership.Groups.Count,
                    IsAdmin = membership.IsAdmin,
                    IsSubmitter = membership.IsSubmitter,
                    IsLegalAdmin = membership.IsLegalAdmin,
                    IsAttorney = membership.IsAttorney,
                    IsCompliance = membership.IsCompliance
                });

                tracker.Complete(true);
                return membership;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to get group membership for {userInfo.Email}", ex);
                tracker.Complete(false, ex.Message);
                return null;
            }
        }

        /// <summary>
        /// Checks if a group name is one of our Legal Workflow groups.
        /// </summary>
        private bool IsLegalWorkflowGroup(string groupName)
        {
            return groupName.Equals(_groupConfig.AdminGroup, StringComparison.OrdinalIgnoreCase) ||
                   groupName.Equals(_groupConfig.SubmittersGroup, StringComparison.OrdinalIgnoreCase) ||
                   groupName.Equals(_groupConfig.LegalAdminGroup, StringComparison.OrdinalIgnoreCase) ||
                   groupName.Equals(_groupConfig.AttorneyAssignerGroup, StringComparison.OrdinalIgnoreCase) ||
                   groupName.Equals(_groupConfig.AttorneysGroup, StringComparison.OrdinalIgnoreCase) ||
                   groupName.Equals(_groupConfig.ComplianceGroup, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Sets role flags based on group membership.
        /// </summary>
        private void SetRoleFlags(UserGroupMembership membership, string groupName)
        {
            if (groupName.Equals(_groupConfig.AdminGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsAdmin = true;
            else if (groupName.Equals(_groupConfig.SubmittersGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsSubmitter = true;
            else if (groupName.Equals(_groupConfig.LegalAdminGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsLegalAdmin = true;
            else if (groupName.Equals(_groupConfig.AttorneyAssignerGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsAttorneyAssigner = true;
            else if (groupName.Equals(_groupConfig.AttorneysGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsAttorney = true;
            else if (groupName.Equals(_groupConfig.ComplianceGroup, StringComparison.OrdinalIgnoreCase))
                membership.IsCompliance = true;
        }

        /// <summary>
        /// Performs action-specific authorization checks.
        /// </summary>
        private async Task<SharePointAuthorizationResult> AuthorizeActionAsync(
            UserAuthInfo userInfo,
            UserGroupMembership membership,
            AuthorizationAction action,
            int? requestId)
        {
            switch (action)
            {
                case AuthorizationAction.InitializePermissions:
                    // Any authorized group member can initialize permissions
                    // (they're creating a new request)
                    return SharePointAuthorizationResult.Authorized(membership);

                case AuthorizationAction.AddUserPermission:
                case AuthorizationAction.RemoveUserPermission:
                    // Only Admin and Legal Admin can manage user permissions
                    if (membership.IsAdmin || membership.IsLegalAdmin)
                    {
                        return SharePointAuthorizationResult.Authorized(membership);
                    }

                    // Submitter can only manage permissions on their own request
                    if (membership.IsSubmitter && requestId.HasValue)
                    {
                        var isOwner = await IsRequestOwnerAsync(userInfo, requestId.Value);
                        if (isOwner)
                        {
                            return SharePointAuthorizationResult.Authorized(membership);
                        }
                    }

                    return SharePointAuthorizationResult.Denied(
                        "Only administrators, legal admin, or the request owner can manage permissions");

                case AuthorizationAction.CompletePermissions:
                    // Only Admin or system (Power Automate) can complete permissions
                    // Since Power Automate won't have a user context, this is typically
                    // called with function-level auth
                    if (membership.IsAdmin)
                    {
                        return SharePointAuthorizationResult.Authorized(membership);
                    }
                    return SharePointAuthorizationResult.Denied(
                        "Only administrators can complete permissions");

                case AuthorizationAction.SendNotification:
                    // Notifications are typically triggered by Power Automate
                    // Any authorized group member can trigger a notification check
                    return SharePointAuthorizationResult.Authorized(membership);

                case AuthorizationAction.ModifyRequest:
                    // Check if user can modify the specific request
                    if (membership.IsAdmin || membership.IsLegalAdmin)
                    {
                        return SharePointAuthorizationResult.Authorized(membership);
                    }

                    // Submitter can only modify their own request
                    if (requestId.HasValue)
                    {
                        var isOwner = await IsRequestOwnerAsync(userInfo, requestId.Value);
                        if (isOwner)
                        {
                            return SharePointAuthorizationResult.Authorized(membership);
                        }
                        return SharePointAuthorizationResult.Denied(
                            "You can only modify requests that you submitted");
                    }

                    return SharePointAuthorizationResult.Denied(
                        "Request ID is required for this operation");

                case AuthorizationAction.ViewRequest:
                    // Any authorized group member can view requests
                    return SharePointAuthorizationResult.Authorized(membership);

                default:
                    return SharePointAuthorizationResult.Denied("Unknown action");
            }
        }

        /// <summary>
        /// Checks if the user is the owner (submitter) of a request.
        /// </summary>
        private async Task<bool> IsRequestOwnerAsync(UserAuthInfo userInfo, int requestId)
        {
            using var tracker = _logger.StartOperation($"IsRequestOwner({requestId})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var list = await context.Web.Lists.GetByTitleAsync("Requests");
                var item = await list.Items.GetByIdAsync(requestId,
                    i => i.All,
                    i => i.FieldValuesAsText);

                if (item == null)
                {
                    _logger.Warning($"Request {requestId} not found for ownership check");
                    tracker.Complete(false, "Request not found");
                    return false;
                }

                // Check SubmittedBy field
                if (item.Values.TryGetValue("SubmittedBy", out var submittedByValue) && submittedByValue != null)
                {
                    if (submittedByValue is IFieldUserValue userValue)
                    {
                        var isOwner = userValue.Email?.Equals(userInfo.Email, StringComparison.OrdinalIgnoreCase) == true ||
                                      userValue.Principal?.LoginName?.Equals(userInfo.SharePointLoginName, StringComparison.OrdinalIgnoreCase) == true;

                        _logger.Info($"Ownership check for request {requestId}: {isOwner}", new
                        {
                            RequestSubmitter = userValue.Email,
                            CurrentUser = userInfo.Email
                        });

                        tracker.Complete(true);
                        return isOwner;
                    }
                }

                // Also check the Created By (Author) field as fallback
                if (item.Values.TryGetValue("Author", out var authorValue) && authorValue != null)
                {
                    if (authorValue is IFieldUserValue userValue)
                    {
                        var isOwner = userValue.Email?.Equals(userInfo.Email, StringComparison.OrdinalIgnoreCase) == true ||
                                      userValue.Principal?.LoginName?.Equals(userInfo.SharePointLoginName, StringComparison.OrdinalIgnoreCase) == true;

                        _logger.Info($"Ownership check (Author) for request {requestId}: {isOwner}");
                        tracker.Complete(true);
                        return isOwner;
                    }
                }

                _logger.Warning($"Could not determine owner for request {requestId}");
                tracker.Complete(false, "Owner field not found");
                return false;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to check ownership for request {requestId}", ex);
                tracker.Complete(false, ex.Message);
                return false;
            }
        }
    }

    /// <summary>
    /// Actions that can be authorized.
    /// </summary>
    public enum AuthorizationAction
    {
        /// <summary>Initialize permissions on a new request</summary>
        InitializePermissions,

        /// <summary>Add a user's permission to a request</summary>
        AddUserPermission,

        /// <summary>Remove a user's permission from a request</summary>
        RemoveUserPermission,

        /// <summary>Set final permissions when request is completed</summary>
        CompletePermissions,

        /// <summary>Send or process a notification</summary>
        SendNotification,

        /// <summary>Modify a request's data</summary>
        ModifyRequest,

        /// <summary>View a request</summary>
        ViewRequest
    }

    /// <summary>
    /// User's SharePoint group membership information.
    /// </summary>
    public class UserGroupMembership
    {
        /// <summary>User's email address</summary>
        public string UserEmail { get; set; } = string.Empty;

        /// <summary>User's SharePoint login name</summary>
        public string UserLoginName { get; set; } = string.Empty;

        /// <summary>List of SharePoint groups the user belongs to</summary>
        public List<string> Groups { get; set; } = new();

        /// <summary>User is in the Admin group</summary>
        public bool IsAdmin { get; set; }

        /// <summary>User is in the Submitters group</summary>
        public bool IsSubmitter { get; set; }

        /// <summary>User is in the Legal Admin group</summary>
        public bool IsLegalAdmin { get; set; }

        /// <summary>User is in the Attorney Assigner group</summary>
        public bool IsAttorneyAssigner { get; set; }

        /// <summary>User is in the Attorneys group</summary>
        public bool IsAttorney { get; set; }

        /// <summary>User is in the Compliance group</summary>
        public bool IsCompliance { get; set; }

        /// <summary>Whether user is a member of at least one authorized group</summary>
        public bool IsInAnyGroup => Groups.Count > 0;
    }

    /// <summary>
    /// Result of a SharePoint authorization check.
    /// </summary>
    public class SharePointAuthorizationResult
    {
        /// <summary>Whether the user is authorized for the action</summary>
        public bool IsAuthorized { get; private set; }

        /// <summary>Error message if not authorized</summary>
        public string ErrorMessage { get; private set; } = string.Empty;

        /// <summary>User's group membership (if authorized)</summary>
        public UserGroupMembership? Membership { get; private set; }

        /// <summary>Creates an authorized result</summary>
        public static SharePointAuthorizationResult Authorized(UserGroupMembership membership)
        {
            return new SharePointAuthorizationResult
            {
                IsAuthorized = true,
                Membership = membership
            };
        }

        /// <summary>Creates a denied result</summary>
        public static SharePointAuthorizationResult Denied(string message)
        {
            return new SharePointAuthorizationResult
            {
                IsAuthorized = false,
                ErrorMessage = message
            };
        }
    }
}
