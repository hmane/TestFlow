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
using PnP.Core.Services;
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

        // SharePoint list/library names
        private const string RequestsListTitle = "Requests";
        private const string DocumentsLibraryTitle = "RequestDocuments";

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
            _logger.SetRequestContext(request.RequestId, request.RequestTitle);

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

                // 1. Initialize permissions on the request list item
                await InitializeItemPermissionsAsync(context, request.RequestId, roleDefinitions, response);

                // 2. Initialize permissions on the documents folder
                await InitializeDocumentsFolderPermissionsAsync(context, request.RequestTitle, roleDefinitions, response);

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
            _logger.SetRequestContext(request.RequestId, request.RequestTitle);
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
                var readRole = await context.Web.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == "Read");
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
                var requestsList = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);
                var requestItem = await requestsList.Items.GetByIdAsync(request.RequestId);

                await requestItem.AddRoleAssignmentsAsync(user.Id, readRole.Name);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"Requests item {request.RequestId}",
                    Action = "AddPermission",
                    Principal = request.UserEmail,
                    Level = PermissionLevel.Read
                });

                _logger.LogPermissionChange("AddPermission", $"Requests item {request.RequestId}", request.UserEmail, "Read");

                // 2. Add permission on documents folder
                var docsFolder = await GetDocumentsFolderAsync(context, request.RequestTitle);
                if (docsFolder != null)
                {
                    await docsFolder.AddRoleAssignmentsAsync(user.Id, readRole.Name);

                    response.Changes.Add(new PermissionChange
                    {
                        Target = $"RequestDocuments/{request.RequestTitle}",
                        Action = "AddPermission",
                        Principal = request.UserEmail,
                        Level = PermissionLevel.Read
                    });

                    _logger.LogPermissionChange("AddPermission", $"RequestDocuments/{request.RequestTitle}", request.UserEmail, "Read");
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
            _logger.SetRequestContext(request.RequestId, request.RequestTitle);
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
                var requestsList = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);
                var requestItem = await requestsList.Items.GetByIdAsync(request.RequestId);

                await requestItem.RemoveRoleAssignmentsAsync(user.Id);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"Requests item {request.RequestId}",
                    Action = "RemovePermission",
                    Principal = request.UserEmail
                });

                _logger.LogPermissionChange("RemovePermission", $"Requests item {request.RequestId}", request.UserEmail);

                // 2. Remove permission from documents folder
                var docsFolder = await GetDocumentsFolderAsync(context, request.RequestTitle);
                if (docsFolder != null)
                {
                    await docsFolder.RemoveRoleAssignmentsAsync(user.Id);

                    response.Changes.Add(new PermissionChange
                    {
                        Target = $"RequestDocuments/{request.RequestTitle}",
                        Action = "RemovePermission",
                        Principal = request.UserEmail
                    });

                    _logger.LogPermissionChange("RemovePermission", $"RequestDocuments/{request.RequestTitle}", request.UserEmail);
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
            _logger.SetRequestContext(request.RequestId, request.RequestTitle);

            var response = new PermissionResponse
            {
                Success = true,
                Changes = new List<PermissionChange>()
            };

            try
            {
                using var context = await _contextFactory.CreateAsync("Default");

                // Get role definitions
                var readRole = await context.Web.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == "Read");
                var fullControlRole = await context.Web.RoleDefinitions.FirstOrDefaultAsync(r => r.Name == "Full Control");

                if (readRole == null || fullControlRole == null)
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
                await UpdateItemToReadOnlyAsync(context, request.RequestId, adminGroup.Id, fullControlRole, readRole, response);

                // 2. Update permissions on documents folder
                await UpdateDocumentsFolderToReadOnlyAsync(context, request.RequestTitle, adminGroup.Id, fullControlRole, readRole, response);

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
        private async Task<RoleDefinitionCollection> GetRoleDefinitionsAsync(PnPContext context)
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
            RoleDefinitionCollection roleDefinitions,
            PermissionResponse response)
        {
            _logger.Info($"Initializing item permissions for request {requestId}");

            var requestsList = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);
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
            var fullControlRole = roleDefinitions.FirstOrDefault(r => r.Name == "Full Control");
            var contributeNoDeleteRole = roleDefinitions.FirstOrDefault(r => r.Name == "Contribute Without Delete")
                ?? roleDefinitions.FirstOrDefault(r => r.Name == "Contribute"); // Fallback
            var readRole = roleDefinitions.FirstOrDefault(r => r.Name == "Read");

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

            _logger.Info($"Item permissions initialized with {response.Changes.Count} changes");
        }

        /// <summary>
        /// Initializes permissions on the documents folder.
        /// </summary>
        private async Task InitializeDocumentsFolderPermissionsAsync(
            PnPContext context,
            string requestTitle,
            RoleDefinitionCollection roleDefinitions,
            PermissionResponse response)
        {
            _logger.Info($"Initializing folder permissions for {requestTitle}");

            var docsFolder = await GetOrCreateDocumentsFolderAsync(context, requestTitle);
            if (docsFolder == null)
            {
                _logger.Warning($"Could not get or create documents folder for {requestTitle}");
                return;
            }

            // Break inheritance
            await docsFolder.BreakRoleInheritanceAsync(copyRoleAssignments: false, clearSubscopes: true);

            response.Changes.Add(new PermissionChange
            {
                Target = $"RequestDocuments/{requestTitle}",
                Action = "BreakInheritance",
                Principal = "System"
            });

            _logger.LogPermissionChange("BreakInheritance", $"RequestDocuments/{requestTitle}", "System");

            // Get role definitions
            var fullControlRole = roleDefinitions.FirstOrDefault(r => r.Name == "Full Control");
            var contributeRole = roleDefinitions.FirstOrDefault(r => r.Name == "Contribute");
            var readRole = roleDefinitions.FirstOrDefault(r => r.Name == "Read");

            // Add Admin group with Full Control
            await AddGroupPermissionToFolderAsync(context, docsFolder, _groupConfig.AdminGroup, fullControlRole, response, $"RequestDocuments/{requestTitle}");

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
                await AddGroupPermissionToFolderAsync(context, docsFolder, groupName, contributeRole, response, $"RequestDocuments/{requestTitle}");
            }

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
                _logger.Warning($"Role definition not found, skipping permission for {groupName}");
                return;
            }

            try
            {
                var group = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == groupName);
                if (group == null)
                {
                    _logger.Warning($"Group '{groupName}' not found, skipping permission");
                    return;
                }

                await item.AddRoleAssignmentsAsync(group.Id, roleDefinition.Name);

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
            catch (Exception ex)
            {
                _logger.Warning($"Failed to add permission for group {groupName}: {ex.Message}");
            }
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
                _logger.Warning($"Role definition not found, skipping permission for {groupName}");
                return;
            }

            try
            {
                var group = await context.Web.SiteGroups.FirstOrDefaultAsync(g => g.Title == groupName);
                if (group == null)
                {
                    _logger.Warning($"Group '{groupName}' not found, skipping permission");
                    return;
                }

                await folder.AddRoleAssignmentsAsync(group.Id, roleDefinition.Name);

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
            catch (Exception ex)
            {
                _logger.Warning($"Failed to add permission for group {groupName}: {ex.Message}");
            }
        }

        /// <summary>
        /// Gets the documents folder for a request, or null if it doesn't exist.
        /// </summary>
        private async Task<IFolder?> GetDocumentsFolderAsync(PnPContext context, string requestTitle)
        {
            try
            {
                var docsLibrary = await context.Web.Lists.GetByTitleAsync(DocumentsLibraryTitle);
                var folderPath = $"{docsLibrary.RootFolder.ServerRelativeUrl}/{requestTitle}";
                var folder = await context.Web.GetFolderByServerRelativeUrlAsync(folderPath);
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
        private async Task<IFolder?> GetOrCreateDocumentsFolderAsync(PnPContext context, string requestTitle)
        {
            try
            {
                var docsLibrary = await context.Web.Lists.GetByTitleAsync(DocumentsLibraryTitle);
                var folderPath = $"{docsLibrary.RootFolder.ServerRelativeUrl}/{requestTitle}";

                try
                {
                    // Try to get existing folder
                    var folder = await context.Web.GetFolderByServerRelativeUrlAsync(folderPath);
                    return folder;
                }
                catch
                {
                    // Folder doesn't exist, create it
                    _logger.Info($"Creating documents folder for {requestTitle}");
                    var newFolder = await docsLibrary.RootFolder.EnsureFolderAsync(requestTitle);
                    return newFolder;
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to get/create documents folder for {requestTitle}", ex);
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
            IRoleDefinition fullControlRole,
            IRoleDefinition readRole,
            PermissionResponse response)
        {
            _logger.Info($"Updating item {requestId} to read-only");

            var requestsList = await context.Web.Lists.GetByTitleAsync(RequestsListTitle);
            var requestItem = await requestsList.Items.GetByIdAsync(requestId);

            // Load current role assignments
            await requestItem.LoadAsync(i => i.RoleAssignments);

            foreach (var roleAssignment in requestItem.RoleAssignments.AsRequested())
            {
                // Skip Admin group - they keep Full Control
                if (roleAssignment.PrincipalId == adminGroupId)
                {
                    continue;
                }

                // Update others to Read
                await requestItem.RemoveRoleAssignmentsAsync(roleAssignment.PrincipalId);
                await requestItem.AddRoleAssignmentsAsync(roleAssignment.PrincipalId, readRole.Name);

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
            string requestTitle,
            int adminGroupId,
            IRoleDefinition fullControlRole,
            IRoleDefinition readRole,
            PermissionResponse response)
        {
            _logger.Info($"Updating folder {requestTitle} to read-only");

            var docsFolder = await GetDocumentsFolderAsync(context, requestTitle);
            if (docsFolder == null)
            {
                _logger.Warning($"Documents folder not found for {requestTitle}");
                return;
            }

            // Load current role assignments
            await docsFolder.LoadAsync(f => f.ListItemAllFields.RoleAssignments);

            foreach (var roleAssignment in docsFolder.ListItemAllFields.RoleAssignments.AsRequested())
            {
                // Skip Admin group - they keep Full Control
                if (roleAssignment.PrincipalId == adminGroupId)
                {
                    continue;
                }

                // Update others to Read
                await docsFolder.RemoveRoleAssignmentsAsync(roleAssignment.PrincipalId);
                await docsFolder.AddRoleAssignmentsAsync(roleAssignment.PrincipalId, readRole.Name);

                response.Changes.Add(new PermissionChange
                {
                    Target = $"RequestDocuments/{requestTitle}",
                    Action = "UpdatePermission",
                    Principal = $"Principal ID: {roleAssignment.PrincipalId}",
                    Level = PermissionLevel.Read
                });
            }
        }

        /// <summary>
        /// Maps SharePoint role definition name to PermissionLevel enum.
        /// </summary>
        private PermissionLevel MapRoleToPermissionLevel(string roleName)
        {
            return roleName switch
            {
                "Full Control" => PermissionLevel.FullControl,
                "Contribute" => PermissionLevel.Contribute,
                "Contribute Without Delete" => PermissionLevel.ContributeWithoutDelete,
                "Read" => PermissionLevel.Read,
                _ => PermissionLevel.Read
            };
        }

        #endregion
    }
}
