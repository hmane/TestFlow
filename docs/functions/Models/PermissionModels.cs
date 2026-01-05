// =============================================================================
// Legal Workflow - Azure Functions
// PermissionModels.cs - Request/Response models for permission operations
// =============================================================================

using System.Collections.Generic;

namespace LegalWorkflow.Functions.Models
{
    /// <summary>
    /// Request payload for InitializePermissions Azure Function.
    /// Called from SPFx app when a request is created (Draft or Legal Intake).
    /// Breaks inheritance and sets initial permissions on both the request item
    /// and the RequestDocuments/{Request_ID} folder.
    /// </summary>
    public class InitializePermissionsRequest
    {
        /// <summary>
        /// SharePoint list item ID of the request.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// Request ID (Title) used to identify the documents folder.
        /// Example: "LRQ-2024-001234"
        /// </summary>
        public string RequestTitle { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request payload for AddUserPermission Azure Function.
    /// Called from SPFx app when a user is added via Manage Access component.
    /// Adds Read permission for the specified user.
    /// </summary>
    public class AddUserPermissionRequest
    {
        /// <summary>
        /// SharePoint list item ID of the request.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// Request ID (Title) used to identify the documents folder.
        /// Example: "LRQ-2024-001234"
        /// </summary>
        public string RequestTitle { get; set; } = string.Empty;

        /// <summary>
        /// Login name of the user to add (claims format).
        /// Example: "i:0#.f|membership|user@domain.com"
        /// </summary>
        public string UserLoginName { get; set; } = string.Empty;

        /// <summary>
        /// Email of the user being added (for logging).
        /// </summary>
        public string UserEmail { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request payload for RemoveUserPermission Azure Function.
    /// Called from SPFx app when a user is removed via Manage Access component.
    /// Removes the user's permission from the request item and documents folder.
    /// </summary>
    public class RemoveUserPermissionRequest
    {
        /// <summary>
        /// SharePoint list item ID of the request.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// Request ID (Title) used to identify the documents folder.
        /// Example: "LRQ-2024-001234"
        /// </summary>
        public string RequestTitle { get; set; } = string.Empty;

        /// <summary>
        /// Login name of the user to remove (claims format).
        /// Example: "i:0#.f|membership|user@domain.com"
        /// </summary>
        public string UserLoginName { get; set; } = string.Empty;

        /// <summary>
        /// Email of the user being removed (for logging).
        /// </summary>
        public string UserEmail { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request payload for CompletePermissions Azure Function.
    /// Called from Power Automate when request status changes to Completed.
    /// Sets final permissions: Admin keeps full access, everyone else gets Read.
    /// </summary>
    public class CompletePermissionsRequest
    {
        /// <summary>
        /// SharePoint list item ID of the request.
        /// </summary>
        public int RequestId { get; set; }

        /// <summary>
        /// Request ID (Title) used to identify the documents folder.
        /// Example: "LRQ-2024-001234"
        /// </summary>
        public string RequestTitle { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response from permission Azure Functions.
    /// </summary>
    public class PermissionResponse
    {
        /// <summary>
        /// Whether the operation was successful.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Descriptive message about the operation result.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// List of permission changes made.
        /// Used for logging and audit trail.
        /// </summary>
        public List<PermissionChange> Changes { get; set; } = new();

        /// <summary>
        /// Error details if Success is false.
        /// </summary>
        public string? Error { get; set; }
    }

    /// <summary>
    /// Represents a single permission change made during an operation.
    /// </summary>
    public class PermissionChange
    {
        /// <summary>
        /// Target of the permission change.
        /// Example: "Requests list item 123", "RequestDocuments/LRQ-2024-001234"
        /// </summary>
        public string Target { get; set; } = string.Empty;

        /// <summary>
        /// Type of change: "BreakInheritance", "AddPermission", "RemovePermission", "UpdatePermission"
        /// </summary>
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// Principal affected (user login or group name).
        /// </summary>
        public string Principal { get; set; } = string.Empty;

        /// <summary>
        /// Permission level applied or removed.
        /// </summary>
        public PermissionLevel? Level { get; set; }
    }

    /// <summary>
    /// Configuration for permission groups used in the system.
    /// Loaded from SharePoint configuration list.
    /// </summary>
    public class PermissionGroupConfig
    {
        /// <summary>SharePoint group name for Submitters</summary>
        public string SubmittersGroup { get; set; } = "LW - Submitters";

        /// <summary>SharePoint group name for Legal Admin</summary>
        public string LegalAdminGroup { get; set; } = "LW - Legal Admin";

        /// <summary>SharePoint group name for Attorney Assigners</summary>
        public string AttorneyAssignerGroup { get; set; } = "LW - Attorney Assigner";

        /// <summary>SharePoint group name for Attorneys</summary>
        public string AttorneysGroup { get; set; } = "LW - Attorneys";

        /// <summary>SharePoint group name for Compliance Users</summary>
        public string ComplianceGroup { get; set; } = "LW - Compliance Users";

        /// <summary>SharePoint group name for Admins (full control)</summary>
        public string AdminGroup { get; set; } = "LW - Admin";
    }
}
