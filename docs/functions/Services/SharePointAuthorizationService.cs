// =============================================================================
// Legal Workflow - Azure Functions
// SharePointAuthorizationService.cs - SharePoint-based authorization service
// =============================================================================
//
// This service performs authorization checks:
// 1. Checks if the caller is the Power Automate service account
// 2. If not, verifies the user has effective edit permissions on the specific
//    request item
//
// APIM handles authentication (token validation). This service only handles
// authorization (permission checks).
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PnP.Core.Model.Security;
using PnP.Core.Model.SharePoint;
using PnP.Core.Services;
using LegalWorkflow.Functions.Constants;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Service for authorizing requests to the Azure Functions.
    /// Uses a two-tier approach:
    /// 1. Service account check: matches caller against the configured Power Automate service account
    /// 2. Item-level permission check: verifies the user has effective edit
    ///    permissions on the specific request item in SharePoint
    /// </summary>
    public class SharePointAuthorizationService
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly Logger _logger;
        private readonly PermissionGroupConfig _groupConfig;
        private readonly SharePointListConfig _listConfig;

        /// <summary>
        /// Creates a new SharePointAuthorizationService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="groupConfig">Configuration containing service account and group settings</param>
        /// <param name="listConfig">SharePoint list name configuration (optional)</param>
        public SharePointAuthorizationService(
            IPnPContextFactory contextFactory,
            Logger logger,
            PermissionGroupConfig groupConfig,
            SharePointListConfig? listConfig = null)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? throw new ArgumentNullException(nameof(groupConfig));
            _listConfig = listConfig ?? new SharePointListConfig();
        }

        /// <summary>
        /// Checks if a user is authorized to perform an action on a request.
        ///
        /// Authorization logic:
        /// 1. If the caller matches the configured Power Automate service account → Authorized
        /// 2. If a requestId is provided, check if the user has effective edit
        ///    permissions on the request item → Authorized
        /// 3. Otherwise → Denied
        /// </summary>
        /// <param name="userInfo">User information from the validated token</param>
        /// <param name="requestId">The request ID to check permissions on (required for user calls)</param>
        /// <returns>SharePointAuthorizationResult with authorization status</returns>
        public async Task<SharePointAuthorizationResult> AuthorizeAsync(
            UserAuthInfo userInfo,
            int? requestId = null)
        {
            using var tracker = _logger.StartOperation($"Authorize(User={userInfo.Email}, RequestId={requestId})");

            try
            {
                // 1. Check if this is the Power Automate service account
                if (IsServiceAccount(userInfo))
                {
                    _logger.Info($"Authorized as Power Automate service account: {userInfo.Email}");
                    tracker.Complete(true, "Service account");
                    return SharePointAuthorizationResult.Authorized("Service account");
                }

                // 2. Check item-level permissions on the request
                if (!requestId.HasValue)
                {
                    _logger.Warning($"No requestId provided for non-service-account user: {userInfo.Email}");
                    tracker.Complete(false, "RequestId required");
                    return SharePointAuthorizationResult.Denied(
                        "Request ID is required to verify permissions");
                }

                var hasPermission = await UserHasWritePermissionAsync(userInfo, requestId.Value);

                if (hasPermission)
                {
                    _logger.Info($"Authorization granted for {userInfo.Email} on request {requestId}");
                    tracker.Complete(true, "Item-level permission");
                    return SharePointAuthorizationResult.Authorized("Item-level permission");
                }

                _logger.Warning($"Authorization denied for {userInfo.Email} on request {requestId} - insufficient permissions");
                tracker.Complete(false, "Insufficient permissions");
                return SharePointAuthorizationResult.Denied(
                    "You do not have sufficient permissions on this request");
            }
            catch (Exception ex)
            {
                _logger.Error($"Authorization check failed for {userInfo.Email}", ex);
                tracker.Complete(false, ex.Message);
                return SharePointAuthorizationResult.Denied("Authorization check failed");
            }
        }

        /// <summary>
        /// Checks if the user is the configured Power Automate service account.
        /// Matches against the ServiceAccountUpn setting in PermissionGroupConfig.
        /// </summary>
        private bool IsServiceAccount(UserAuthInfo userInfo)
        {
            if (string.IsNullOrEmpty(_groupConfig.ServiceAccountUpn))
            {
                return false;
            }

            // Match against email or UPN (case-insensitive)
            return _groupConfig.ServiceAccountUpn.Equals(userInfo.Email, StringComparison.OrdinalIgnoreCase) ||
                   _groupConfig.ServiceAccountUpn.Equals(userInfo.UserPrincipalName, StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Checks if the user has effective edit permissions
        /// on the specific request item. This leverages the item-level permissions that
        /// are set when a request is submitted (inheritance is broken).
        ///
        /// Before inheritance is broken (Draft), users inherit from the list, so this
        /// check still works correctly.
        /// </summary>
        /// <param name="userInfo">User information from the validated token</param>
        /// <param name="requestId">SharePoint list item ID of the request</param>
        /// <returns>True if the user has write permission on the item</returns>
        private async Task<bool> UserHasWritePermissionAsync(UserAuthInfo userInfo, int requestId)
        {
            using var tracker = _logger.StartOperation($"CheckItemPermission({requestId})");

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                var resolvedUser = await ResolveUserAsync(context, userInfo);
                if (resolvedUser == null)
                {
                    _logger.Warning($"Cannot check permissions — unable to resolve SharePoint user for {userInfo.Email}");
                    tracker.Complete(false, "User resolution failed");
                    return false;
                }

                if (resolvedUser.IsSiteAdmin)
                {
                    _logger.Info($"User {userInfo.Email} is a site collection administrator");
                    tracker.Complete(true, "Site collection administrator");
                    return true;
                }

                var list = await context.Web.Lists.GetByTitleAsync(_listConfig.RequestsListName);
                var item = await list.Items.GetByIdAsync(requestId);

                var hasWritePermission = await item.CheckIfUserHasPermissionsAsync(
                    resolvedUser.LoginName,
                    PermissionKind.EditListItems);

                if (hasWritePermission)
                {
                    _logger.Info($"User {userInfo.Email} has write permission on request {requestId}",
                        new
                        {
                            PermissionKind = PermissionKind.EditListItems.ToString(),
                            ResolvedLoginName = resolvedUser.LoginName,
                        });
                    tracker.Complete(true, "Effective permission");
                    return true;
                }

                _logger.Info($"User {userInfo.Email} does not have write permission on request {requestId}",
                    new { ResolvedLoginName = resolvedUser.LoginName });
                tracker.Complete(false, "No write permission found");
                return false;
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to check item permissions for request {requestId}", ex);
                tracker.Complete(false, ex.Message);
                return false;
            }
        }

        private async Task<ISharePointUser?> ResolveUserAsync(IPnPContext context, UserAuthInfo userInfo)
        {
            var candidates = new List<string>
            {
                userInfo.SharePointLoginName,
                userInfo.UserPrincipalName,
                userInfo.Email,
            }
            .Where(candidate => !string.IsNullOrWhiteSpace(candidate))
            .Distinct(StringComparer.OrdinalIgnoreCase);

            Exception? lastException = null;

            foreach (var candidate in candidates)
            {
                try
                {
                    var user = await context.Web.EnsureUserAsync(candidate);
                    if (user != null && !string.IsNullOrWhiteSpace(user.LoginName))
                    {
                        _logger.Info($"Resolved SharePoint user for {userInfo.Email}",
                            new
                            {
                                Candidate = candidate,
                                ResolvedLoginName = user.LoginName,
                                user.IsSiteAdmin,
                            });
                        return user;
                    }
                }
                catch (Exception ex)
                {
                    lastException = ex;
                    _logger.Warning($"Failed to resolve SharePoint user using candidate '{candidate}'",
                        new { userInfo.Email, Error = ex.Message });
                }
            }

            if (lastException != null)
            {
                _logger.Warning($"Unable to resolve SharePoint user for {userInfo.Email} after trying all candidates",
                    new
                    {
                        userInfo.Email,
                        userInfo.UserPrincipalName,
                        userInfo.SharePointLoginName,
                        Error = lastException.Message,
                    });
            }

            return null;
        }
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

        /// <summary>Reason for authorization (e.g., "Service account", "Item-level permission")</summary>
        public string Reason { get; private set; } = string.Empty;

        /// <summary>Creates an authorized result</summary>
        public static SharePointAuthorizationResult Authorized(string reason)
        {
            return new SharePointAuthorizationResult
            {
                IsAuthorized = true,
                Reason = reason
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
