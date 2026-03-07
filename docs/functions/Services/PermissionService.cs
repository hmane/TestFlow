// =============================================================================
// Legal Workflow - Azure Functions
// PermissionService.cs - Service for managing SharePoint permissions
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PnP.Core.Model.SharePoint;
using PnP.Core.Model.Security;
using PnP.Core.QueryModel;
using PnP.Core.Services;
using LegalWorkflow.Functions.Constants;
using LegalWorkflow.Functions.Constants.SharePointFields;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Service for managing SharePoint permissions on Legal Review Requests.
    /// Handles breaking inheritance and setting item-level permissions on both
    /// the Requests list item and the corresponding RequestDocuments folder.
    ///
    /// Permission Model:
    /// - Request Creation (Draft/Legal Intake):
    ///   - Break inheritance on request item and documents folder
    ///   - LW - Admin: Full Control on both
    ///   - LW - Submitters: Contribute Without Delete on item, Contribute on docs
    ///   - LW - Legal Admin: Contribute Without Delete on item, Contribute on docs
    ///   - LW - Attorney Assigner: Contribute Without Delete on item, Contribute on docs
    ///   - LW - Attorneys: Contribute Without Delete on item, Contribute on docs
    ///   - LW - Compliance Users: Contribute Without Delete on item, Contribute on docs
    ///   - Additional Parties: Read only on item and docs
    ///   - Approvers: Read only on item and docs
    ///
    /// - Request Completion:
    ///   - LW - Admin: Keep Full Control
    ///   - Everyone else: Change to Read only
    ///
    /// - Manage Access (user add/remove):
    ///   - Add user: Grant Read permission
    ///   - Remove user: Remove all permissions for user
    /// </summary>
    public class PermissionService
    {
        private readonly IPnPContextFactory _contextFactory;
        private readonly Logger _logger;
        private readonly PermissionGroupConfig _groupConfig;

        /// <summary>
        /// Creates a new PermissionService instance.
        /// </summary>
        /// <param name="contextFactory">PnP Core context factory for SharePoint access</param>
        /// <param name="logger">Logger instance for logging operations</param>
        /// <param name="groupConfig">Configuration for SharePoint group names</param>
        public PermissionService(IPnPContextFactory contextFactory, Logger logger, PermissionGroupConfig? groupConfig = null)
        {
            _contextFactory = contextFactory ?? throw new ArgumentNullException(nameof(contextFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _groupConfig = groupConfig ?? new PermissionGroupConfig();
        }

        /// <summary>
        /// Initializes permissions for a newly created request.
        /// Breaks inheritance and sets up initial permissions on both the request item
        /// and the documents folder.
        /// Called from SPFx app when request is saved (Draft or Legal Intake).
        /// </summary>
        /// <param name="request">The initialize permissions request</param>
        /// <returns>Permission response with details of changes made</returns>
        public async Task<PermissionResponse> InitializePermissionsAsync(InitializePermissionsRequest request)
        {
            using var tracker = _logger.StartOperation($"InitializePermissions({request.RequestId})");
            _logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

            var response = new PermissionResponse
            {
                Success = true,
                Changes = new List<PermissionChange>()
            };

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get permission levels we'll need
                var roleDefinitions = await GetRoleDefinitionsAsync(context);

                var readOnlyParticipants = await GetReadOnlyParticipantsAsync(context, request.RequestId);

                // 1. Initialize permissions on the request list item
                await InitializeItemPermissionsAsync(context, request.RequestId, roleDefinitions, readOnlyParticipants, response);

                // 2. Initialize permissions on the documents folder
                await InitializeDocumentsFolderPermissionsAsync(context, request.RequestId, roleDefinitions, readOnlyParticipants, response);

                response.Message = $"Permissions initialized successfully. {response.Changes.Count} changes made.";
                _logger.Info("Permissions initialized successfully", new { ChangeCount = response.Changes.Count });

                tracker.Complete(true);
                return response;
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to initialize permissions", ex);
                response.Success = false;
                response.Error = ex.Message;
                response.Message = $"Failed to initialize permissions: {ex.Message}";

                tracker.Complete(false, response.Message);
                return response;
            }
        }

        /// <summary>
        /// Adds Read permission for a user on the request and documents folder.
        /// Called from SPFx app when user is added via Manage Access component.
        /// </summary>
        /// <param name="request">The add user permission request</param>
        /// <returns>Permission response with details of changes made</returns>
        public async Task<PermissionResponse> AddUserPermissionAsync(AddUserPermissionRequest request)
        {
            using var tracker = _logger.StartOperation($"AddUserPermission({request.RequestId}, {request.UserEmail})");
            _logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));
            _logger.SetUserContext(request.UserEmail, request.UserLoginName);

            var response = new PermissionResponse
            {
                Success = true,
                Changes = new List<PermissionChange>()
            };

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get Read role definition
                var readRole = await context.Web.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == RoleDefinitions.Read);
                if (readRole == null)
                {
                    throw new InvalidOperationException("Read role definition not found");
                }

                // Get the user
                var user = await context.Web.EnsureUserAsync(request.UserLoginName);
                if (user == null)
                {
                    throw new InvalidOperationException($"User not found: {request.UserLoginName}");
                }

                // 1. Add permission on request item
                var requestsList = await context.Web.Lists.GetByTitleAsync(SharePointLists.Requests);
                var requestItem = await requestsList.Items.GetByIdAsync(request.RequestId);

                await EnsureRoleDefinitionAsync(requestItem, user.Id, readRole);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"Requests item {request.RequestId}",
                    Action = "AddPermission",
                    Principal = request.UserEmail,
                    Level = PermissionLevel.Read
                });

                _logger.LogPermissionChange("AddPermission", $"Requests item {request.RequestId}", request.UserEmail, "Read");

                // 2. Add permission on documents folder
                var docsFolder = await GetDocumentsFolderAsync(context, request.RequestId);
                if (docsFolder != null)
                {
                    var docsFolderItem = await GetFolderListItemAsync(docsFolder);
                    await EnsureRoleDefinitionAsync(docsFolderItem, user.Id, readRole);

                    response.Changes.Add(new PermissionChange
                    {
                        Target = $"RequestDocuments/{request.RequestId}",
                        Action = "AddPermission",
                        Principal = request.UserEmail,
                        Level = PermissionLevel.Read
                    });

                    _logger.LogPermissionChange("AddPermission", $"RequestDocuments/{request.RequestId}", request.UserEmail, "Read");
                }

                response.Message = $"Read permission granted to {request.UserEmail}";
                tracker.Complete(true);
                return response;
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to add user permission", ex, new { UserEmail = request.UserEmail });
                response.Success = false;
                response.Error = ex.Message;
                response.Message = $"Failed to add permission: {ex.Message}";

                tracker.Complete(false, response.Message);
                return response;
            }
        }

        /// <summary>
        /// Removes a user's permission from the request and documents folder.
        /// Called from SPFx app when user is removed via Manage Access component.
        /// </summary>
        /// <param name="request">The remove user permission request</param>
        /// <returns>Permission response with details of changes made</returns>
        public async Task<PermissionResponse> RemoveUserPermissionAsync(RemoveUserPermissionRequest request)
        {
            using var tracker = _logger.StartOperation($"RemoveUserPermission({request.RequestId}, {request.UserEmail})");
            _logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));
            _logger.SetUserContext(request.UserEmail, request.UserLoginName);

            var response = new PermissionResponse
            {
                Success = true,
                Changes = new List<PermissionChange>()
            };

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get the user
                var user = await context.Web.EnsureUserAsync(request.UserLoginName);
                if (user == null)
                {
                    throw new InvalidOperationException($"User not found: {request.UserLoginName}");
                }

                // 1. Remove permission from request item
                var requestsList = await context.Web.Lists.GetByTitleAsync(SharePointLists.Requests);
                var requestItem = await requestsList.Items.GetByIdAsync(request.RequestId);

                await RemoveAllRoleDefinitionsAsync(requestItem, user.Id);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"Requests item {request.RequestId}",
                    Action = "RemovePermission",
                    Principal = request.UserEmail
                });

                _logger.LogPermissionChange("RemovePermission", $"Requests item {request.RequestId}", request.UserEmail);

                // 2. Remove permission from documents folder
                var docsFolder = await GetDocumentsFolderAsync(context, request.RequestId);
                if (docsFolder != null)
                {
                    var docsFolderItem = await GetFolderListItemAsync(docsFolder);
                    await RemoveAllRoleDefinitionsAsync(docsFolderItem, user.Id);

                    response.Changes.Add(new PermissionChange
                    {
                        Target = $"RequestDocuments/{request.RequestId}",
                        Action = "RemovePermission",
                        Principal = request.UserEmail
                    });

                    _logger.LogPermissionChange("RemovePermission", $"RequestDocuments/{request.RequestId}", request.UserEmail);
                }

                response.Message = $"Permission removed for {request.UserEmail}";
                tracker.Complete(true);
                return response;
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to remove user permission", ex, new { UserEmail = request.UserEmail });
                response.Success = false;
                response.Error = ex.Message;
                response.Message = $"Failed to remove permission: {ex.Message}";

                tracker.Complete(false, response.Message);
                return response;
            }
        }

        /// <summary>
        /// Updates permissions when a request is completed.
        /// Admin keeps Full Control, everyone else gets Read only.
        /// Called from Power Automate when status changes to Completed.
        /// </summary>
        /// <param name="request">The complete permissions request</param>
        /// <returns>Permission response with details of changes made</returns>
        public async Task<PermissionResponse> CompletePermissionsAsync(CompletePermissionsRequest request)
        {
            using var tracker = _logger.StartOperation($"CompletePermissions({request.RequestId})");
            _logger.SetRequestContext(request.RequestId, GetRequestContextTitle(request.RequestId, request.RequestTitle));

            var response = new PermissionResponse
            {
                Success = true,
                Changes = new List<PermissionChange>()
            };

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get role definitions
                var readRole = await context.Web.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == RoleDefinitions.Read);
                if (readRole == null)
                {
                    throw new InvalidOperationException("Required role definitions not found");
                }

                // Get the Admin group
                var adminGroup = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == _groupConfig.AdminGroup);
                if (adminGroup == null)
                {
                    throw new InvalidOperationException($"Admin group '{_groupConfig.AdminGroup}' not found");
                }

                // 1. Update permissions on request item
                await UpdateItemToReadOnlyAsync(context, request.RequestId, adminGroup.Id, readRole, response);

                // 2. Update permissions on documents folder
                await UpdateDocumentsFolderToReadOnlyAsync(context, request.RequestId, adminGroup.Id, readRole, response);

                response.Message = $"Request completed. All permissions updated to Read (Admin retains Full Control). {response.Changes.Count} changes made.";
                _logger.Info("Completion permissions set successfully", new { ChangeCount = response.Changes.Count });

                tracker.Complete(true);
                return response;
            }
            catch (Exception ex)
            {
                _logger.Error("Failed to complete permissions", ex);
                response.Success = false;
                response.Error = ex.Message;
                response.Message = $"Failed to complete permissions: {ex.Message}";

                tracker.Complete(false, response.Message);
                return response;
            }
        }

        #region Private Helper Methods

        /// <summary>
        /// Gets required role definitions from SharePoint.
        /// </summary>
        private async Task<IRoleDefinitionCollection> GetRoleDefinitionsAsync(PnPContext context)
        {
            // Load role definitions we need
            await context.Web.RoleDefinitions.LoadAsync();
            return context.Web.RoleDefinitions;
        }

        /// <summary>
        /// Initializes permissions on the request list item.
        /// </summary>
        private async Task InitializeItemPermissionsAsync(
            PnPContext context,
            int requestId,
            IRoleDefinitionCollection roleDefinitions,
            IReadOnlyCollection<RequestParticipant> readOnlyParticipants,
            PermissionResponse response)
        {
            _logger.Info($"Initializing item permissions for request {requestId}");

            var requestsList = await context.Web.Lists.GetByTitleAsync(SharePointLists.Requests);
            var requestItem = await requestsList.Items.GetByIdAsync(requestId);

            // Break inheritance (copy existing = false to start fresh)
            await requestItem.BreakRoleInheritanceAsync(copyRoleAssignments: false, clearSubscopes: true);

            response.Changes.Add(new PermissionChange
            {
                Target = $"Requests item {requestId}",
                Action = "BreakInheritance",
                Principal = "System"
            });

            _logger.LogPermissionChange("BreakInheritance", $"Requests item {requestId}", "System");

            // Get role definitions we need
            var fullControlRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.FullControl);
            var contributeNoDeleteRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.ContributeWithoutDelete)
                ?? roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.Contribute); // Fallback
            // Add Admin group with Full Control
            await AddGroupPermissionAsync(context, requestItem, _groupConfig.AdminGroup, fullControlRole, response, $"Requests item {requestId}");

            // Add operational groups with Contribute Without Delete
            var operationalGroups = new[]
            {
                _groupConfig.SubmittersGroup,
                _groupConfig.LegalAdminGroup,
                _groupConfig.AttorneyAssignerGroup,
                _groupConfig.AttorneysGroup,
                _groupConfig.ComplianceGroup
            };

            foreach (var groupName in operationalGroups)
            {
                await AddGroupPermissionAsync(context, requestItem, groupName, contributeNoDeleteRole, response, $"Requests item {requestId}");
            }

            var readRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.Read);
            await AddReadPermissionsForParticipantsAsync(
                context,
                requestItem,
                readOnlyParticipants,
                readRole,
                response,
                $"Requests item {requestId}");

            _logger.Info($"Item permissions initialized with {response.Changes.Count} changes");
        }

        /// <summary>
        /// Initializes permissions on the documents folder.
        /// </summary>
        private async Task InitializeDocumentsFolderPermissionsAsync(
            PnPContext context,
            int requestId,
            IRoleDefinitionCollection roleDefinitions,
            IReadOnlyCollection<RequestParticipant> readOnlyParticipants,
            PermissionResponse response)
        {
            _logger.Info($"Initializing folder permissions for {requestId}");

            var docsFolder = await GetOrCreateDocumentsFolderAsync(context, requestId);
            if (docsFolder == null)
            {
                _logger.Warning($"Could not get or create documents folder for {requestId}");
                return;
            }

            // Break inheritance
            var docsFolderItem = await GetFolderListItemAsync(docsFolder);

            await docsFolderItem.BreakRoleInheritanceAsync(copyRoleAssignments: false, clearSubscopes: true);

            response.Changes.Add(new PermissionChange
            {
                Target = $"RequestDocuments/{requestId}",
                Action = "BreakInheritance",
                Principal = "System"
            });

            _logger.LogPermissionChange("BreakInheritance", $"RequestDocuments/{requestId}", "System");

            // Get role definitions
            var fullControlRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.FullControl);
            var contributeRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.Contribute);
            // Add Admin group with Full Control
            await AddGroupPermissionToFolderAsync(context, docsFolder, _groupConfig.AdminGroup, fullControlRole, response, $"RequestDocuments/{requestId}");

            // Add operational groups with Contribute (they need to upload/modify documents)
            var operationalGroups = new[]
            {
                _groupConfig.SubmittersGroup,
                _groupConfig.LegalAdminGroup,
                _groupConfig.AttorneyAssignerGroup,
                _groupConfig.AttorneysGroup,
                _groupConfig.ComplianceGroup
            };

            foreach (var groupName in operationalGroups)
            {
                await AddGroupPermissionToFolderAsync(context, docsFolder, groupName, contributeRole, response, $"RequestDocuments/{requestId}");
            }

            var readRole = roleDefinitions.FirstOrDefault(r => r.Name == RoleDefinitions.Read);
            await AddReadPermissionsForParticipantsAsync(
                context,
                docsFolderItem,
                readOnlyParticipants,
                readRole,
                response,
                $"RequestDocuments/{requestId}");

            _logger.Info($"Folder permissions initialized");
        }

        /// <summary>
        /// Adds a group permission to a list item.
        /// </summary>
        private async Task AddGroupPermissionAsync(
            PnPContext context,
            IListItem item,
            string groupName,
            IRoleDefinition? roleDefinition,
            PermissionResponse response,
            string targetDescription)
        {
            if (roleDefinition == null)
            {
                throw new InvalidOperationException($"Role definition not found for required group '{groupName}'");
            }

            var group = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == groupName);
            if (group == null)
            {
                throw new InvalidOperationException($"Required SharePoint group '{groupName}' was not found");
            }

            await EnsureRoleDefinitionAsync(item, group.Id, roleDefinition);

            var permLevel = MapRoleToPermissionLevel(roleDefinition.Name);
            response.Changes.Add(new PermissionChange
            {
                Target = targetDescription,
                Action = "AddPermission",
                Principal = groupName,
                Level = permLevel
            });

            _logger.LogPermissionChange("AddPermission", targetDescription, groupName, roleDefinition.Name);
        }

        /// <summary>
        /// Adds a group permission to a folder.
        /// </summary>
        private async Task AddGroupPermissionToFolderAsync(
            PnPContext context,
            IFolder folder,
            string groupName,
            IRoleDefinition? roleDefinition,
            PermissionResponse response,
            string targetDescription)
        {
            if (roleDefinition == null)
            {
                throw new InvalidOperationException($"Role definition not found for required group '{groupName}'");
            }

            var group = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == groupName);
            if (group == null)
            {
                throw new InvalidOperationException($"Required SharePoint group '{groupName}' was not found");
            }

            var folderItem = await GetFolderListItemAsync(folder);
            await EnsureRoleDefinitionAsync(folderItem, group.Id, roleDefinition);

            var permLevel = MapRoleToPermissionLevel(roleDefinition.Name);
            response.Changes.Add(new PermissionChange
            {
                Target = targetDescription,
                Action = "AddPermission",
                Principal = groupName,
                Level = permLevel
            });

            _logger.LogPermissionChange("AddPermission", targetDescription, groupName, roleDefinition.Name);
        }

        /// <summary>
        /// Adds direct read permissions for additional parties and approvers.
        /// </summary>
        private async Task AddReadPermissionsForParticipantsAsync(
            PnPContext context,
            ISecurableObject securableObject,
            IReadOnlyCollection<RequestParticipant> participants,
            IRoleDefinition? readRole,
            PermissionResponse response,
            string targetDescription)
        {
            if (participants.Count == 0)
            {
                return;
            }

            if (readRole == null)
            {
                throw new InvalidOperationException("Read role definition not found for direct participant permissions");
            }

            foreach (var participant in participants)
            {
                var user = await ResolveSharePointUserAsync(context, participant);
                if (user == null)
                {
                    throw new InvalidOperationException($"Could not resolve SharePoint user for '{participant.DisplayName}'");
                }

                await EnsureRoleDefinitionAsync(securableObject, user.Id, readRole);

                response.Changes.Add(new PermissionChange
                {
                    Target = targetDescription,
                    Action = "AddPermission",
                    Principal = !string.IsNullOrWhiteSpace(participant.Email) ? participant.Email : participant.DisplayName,
                    Level = PermissionLevel.Read
                });

                _logger.LogPermissionChange(
                    "AddPermission",
                    targetDescription,
                    !string.IsNullOrWhiteSpace(participant.Email) ? participant.Email : participant.DisplayName,
                    readRole.Name);
            }
        }

        /// <summary>
        /// Gets the documents folder for a request, or null if it doesn't exist.
        /// </summary>
        private async Task<IFolder?> GetDocumentsFolderAsync(PnPContext context, int requestId)
        {
            try
            {
                var docsLibrary = await GetDocumentsLibraryAsync(context);
                var folderPath = $"{docsLibrary.RootFolder.ServerRelativeUrl}/{requestId}";
                var folder = await context.Web.GetFolderByServerRelativeUrlAsync(folderPath, f => f.ListItemAllFields);
                return folder;
            }
            catch
            {
                // Folder doesn't exist
                return null;
            }
        }

        /// <summary>
        /// Gets or creates the documents folder for a request.
        /// </summary>
        private async Task<IFolder?> GetOrCreateDocumentsFolderAsync(PnPContext context, int requestId)
        {
            try
            {
                var docsLibrary = await GetDocumentsLibraryAsync(context);
                var folderName = requestId.ToString();
                var folderPath = $"{docsLibrary.RootFolder.ServerRelativeUrl}/{folderName}";

                try
                {
                    // Try to get existing folder
                    var folder = await context.Web.GetFolderByServerRelativeUrlAsync(folderPath, f => f.ListItemAllFields);
                    return folder;
                }
                catch
                {
                    // Folder doesn't exist, create it
                    _logger.Info($"Creating documents folder for {requestId}");
                    var newFolder = await docsLibrary.RootFolder.EnsureFolderAsync(folderName);
                    return newFolder;
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to get/create documents folder for {requestId}", ex);
                return null;
            }
        }

        /// <summary>
        /// Updates a list item to read-only (except Admin which keeps Full Control).
        /// </summary>
        private async Task UpdateItemToReadOnlyAsync(
            PnPContext context,
            int requestId,
            int adminGroupId,
            IRoleDefinition readRole,
            PermissionResponse response)
        {
            _logger.Info($"Updating item {requestId} to read-only");

            var requestsList = await context.Web.Lists.GetByTitleAsync(SharePointLists.Requests);
            var requestItem = await requestsList.Items.GetByIdAsync(requestId);

            // Load current role assignments
            await requestItem.LoadAsync(i => i.RoleAssignments.QueryProperties(ra => ra.PrincipalId));

            var roleAssignments = requestItem.RoleAssignments.AsRequested().ToList();
            foreach (var roleAssignment in roleAssignments)
            {
                // Skip Admin group - they keep Full Control
                if (roleAssignment.PrincipalId == adminGroupId)
                {
                    continue;
                }

                // Update others to Read
                await ReplaceRoleDefinitionsAsync(requestItem, roleAssignment.PrincipalId, readRole);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"Requests item {requestId}",
                    Action = "UpdatePermission",
                    Principal = $"Principal ID: {roleAssignment.PrincipalId}",
                    Level = PermissionLevel.Read
                });
            }
        }

        /// <summary>
        /// Updates documents folder to read-only (except Admin which keeps Full Control).
        /// </summary>
        private async Task UpdateDocumentsFolderToReadOnlyAsync(
            PnPContext context,
            int requestId,
            int adminGroupId,
            IRoleDefinition readRole,
            PermissionResponse response)
        {
            _logger.Info($"Updating folder {requestId} to read-only");

            var docsFolder = await GetDocumentsFolderAsync(context, requestId);
            if (docsFolder == null)
            {
                _logger.Warning($"Documents folder not found for {requestId}");
                return;
            }

            // Load current role assignments
            var docsFolderItem = await GetFolderListItemAsync(docsFolder);
            await docsFolderItem.LoadAsync(i => i.RoleAssignments.QueryProperties(ra => ra.PrincipalId));

            var roleAssignments = docsFolderItem.RoleAssignments.AsRequested().ToList();
            foreach (var roleAssignment in roleAssignments)
            {
                // Skip Admin group - they keep Full Control
                if (roleAssignment.PrincipalId == adminGroupId)
                {
                    continue;
                }

                // Update others to Read
                await ReplaceRoleDefinitionsAsync(docsFolderItem, roleAssignment.PrincipalId, readRole);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"RequestDocuments/{requestId}",
                    Action = "UpdatePermission",
                    Principal = $"Principal ID: {roleAssignment.PrincipalId}",
                    Level = PermissionLevel.Read
                });
            }
        }

        private static string GetRequestContextTitle(int requestId, string? requestTitle)
        {
            return string.IsNullOrWhiteSpace(requestTitle) ? requestId.ToString() : requestTitle;
        }

        /// <summary>
        /// Maps SharePoint role definition name to PermissionLevel enum.
        /// </summary>
        private PermissionLevel MapRoleToPermissionLevel(string roleName)
        {
            if (roleName == RoleDefinitions.FullControl)
                return PermissionLevel.FullControl;
            if (roleName == RoleDefinitions.Contribute)
                return PermissionLevel.Contribute;
            if (roleName == RoleDefinitions.ContributeWithoutDelete)
                return PermissionLevel.ContributeWithoutDelete;
            if (roleName == RoleDefinitions.Read)
                return PermissionLevel.Read;
            return PermissionLevel.Read;
        }

        /// <summary>
        /// Loads the RequestDocuments library with the root folder URL required for folder lookups.
        /// </summary>
        private async Task<PnP.Core.Model.SharePoint.IList> GetDocumentsLibraryAsync(PnPContext context)
        {
            var docsLibrary = await context.Web.Lists.GetByTitleAsync(
                SharePointLists.RequestDocuments,
                l => l.RootFolder);

            await docsLibrary.RootFolder.LoadAsync(f => f.ServerRelativeUrl);
            return docsLibrary;
        }

        /// <summary>
        /// Gets the list item backing a folder, which is the securable object used for permissions.
        /// </summary>
        private static async Task<IListItem> GetFolderListItemAsync(IFolder folder)
        {
            await folder.LoadAsync(f => f.ListItemAllFields);
            return folder.ListItemAllFields;
        }

        /// <summary>
        /// Ensures the securable object has the requested role definition for the specified principal.
        /// </summary>
        private static async Task EnsureRoleDefinitionAsync(
            ISecurableObject securableObject,
            int principalId,
            IRoleDefinition roleDefinition)
        {
            var existingRoleDefinitions = await securableObject.GetRoleDefinitionsAsync(principalId);
            var alreadyAssigned = existingRoleDefinitions.Any(r =>
                string.Equals(r.Name, roleDefinition.Name, StringComparison.OrdinalIgnoreCase));

            if (!alreadyAssigned)
            {
                await securableObject.AddRoleDefinitionAsync(principalId, roleDefinition);
            }
        }

        /// <summary>
        /// Removes all currently assigned role definitions for the specified principal.
        /// </summary>
        private static async Task RemoveAllRoleDefinitionsAsync(ISecurableObject securableObject, int principalId)
        {
            var existingRoleDefinitions = await securableObject.GetRoleDefinitionsAsync(principalId);
            var roleNames = existingRoleDefinitions
                .Select(roleDefinition => roleDefinition.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (roleNames.Length > 0)
            {
                await securableObject.RemoveRoleDefinitionsAsync(principalId, roleNames);
            }
        }

        /// <summary>
        /// Replaces all current role definitions for a principal with the provided role definition.
        /// </summary>
        private static async Task ReplaceRoleDefinitionsAsync(
            ISecurableObject securableObject,
            int principalId,
            IRoleDefinition roleDefinition)
        {
            await RemoveAllRoleDefinitionsAsync(securableObject, principalId);
            await securableObject.AddRoleDefinitionAsync(principalId, roleDefinition);
        }

        /// <summary>
        /// Gets the additional parties and approval users that require direct read permissions.
        /// </summary>
        private async Task<IReadOnlyCollection<RequestParticipant>> GetReadOnlyParticipantsAsync(PnPContext context, int requestId)
        {
            var requestsList = await context.Web.Lists.GetByTitleAsync(SharePointLists.Requests);
            var requestItem = await requestsList.Items.GetByIdAsync(requestId, i => i.All);

            var participants = new Dictionary<string, RequestParticipant>(StringComparer.OrdinalIgnoreCase);

            AddParticipantsFromValue(participants, GetFieldValue(requestItem, RequestsFields.AdditionalParty));

            var approverFields = new[]
            {
                RequestsFields.CommunicationsApprover,
                RequestsFields.PortfolioManager,
                RequestsFields.ResearchAnalyst,
                RequestsFields.SubjectMatterExpert,
                RequestsFields.PerformanceApprover,
                RequestsFields.OtherApproval
            };

            foreach (var fieldName in approverFields)
            {
                AddParticipantsFromValue(participants, GetFieldValue(requestItem, fieldName));
            }

            return participants.Values.ToList();
        }

        /// <summary>
        /// Safely gets a field value from a request item.
        /// </summary>
        private static object? GetFieldValue(IListItem item, string fieldName)
        {
            return item.Values.TryGetValue(fieldName, out var value) ? value : null;
        }

        /// <summary>
        /// Adds one or more SharePoint user field values to the participant map.
        /// </summary>
        private static void AddParticipantsFromValue(
            IDictionary<string, RequestParticipant> participants,
            object? fieldValue)
        {
            switch (fieldValue)
            {
                case IFieldUserValue userValue:
                    AddParticipant(participants, userValue);
                    break;
                case IEnumerable<IFieldUserValue> userValues:
                    foreach (var value in userValues)
                    {
                        AddParticipant(participants, value);
                    }
                    break;
            }
        }

        /// <summary>
        /// Adds a participant entry if the user field contains enough identity data to resolve later.
        /// </summary>
        private static void AddParticipant(IDictionary<string, RequestParticipant> participants, IFieldUserValue userValue)
        {
            var email = userValue.Email?.Trim() ?? string.Empty;
            var loginName = userValue.Principal?.LoginName?.Trim() ?? string.Empty;
            var displayName = userValue.LookupValue?.Trim() ?? email;

            if (string.IsNullOrWhiteSpace(loginName) && string.IsNullOrWhiteSpace(email))
            {
                return;
            }

            var key = !string.IsNullOrWhiteSpace(loginName)
                ? loginName
                : email;

            participants[key] = new RequestParticipant
            {
                DisplayName = string.IsNullOrWhiteSpace(displayName) ? key : displayName,
                Email = email,
                LoginName = loginName
            };
        }

        /// <summary>
        /// Resolves a SharePoint user from the best available identifier.
        /// </summary>
        private static async Task<ISharePointUser?> ResolveSharePointUserAsync(PnPContext context, RequestParticipant participant)
        {
            if (!string.IsNullOrWhiteSpace(participant.LoginName))
            {
                return await context.Web.EnsureUserAsync(participant.LoginName);
            }

            if (!string.IsNullOrWhiteSpace(participant.Email))
            {
                return await context.Web.EnsureUserAsync(participant.Email);
            }

            return null;
        }

        /// <summary>
        /// Minimal user identity needed to grant direct read permissions.
        /// </summary>
        private sealed class RequestParticipant
        {
            public string DisplayName { get; init; } = string.Empty;

            public string Email { get; init; } = string.Empty;

            public string LoginName { get; init; } = string.Empty;
        }

        #endregion
    }
}
