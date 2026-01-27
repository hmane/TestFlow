// =============================================================================
// Legal Workflow - Azure Functions
// RoleDefinitions.cs - SharePoint role definition name constants
// =============================================================================
//
// This file contains constants for SharePoint role definition names.
// These are built-in SharePoint permission levels.
// =============================================================================

namespace LegalWorkflow.Functions.Constants
{
    /// <summary>
    /// SharePoint role definition (permission level) names.
    /// These are built-in SharePoint permission levels.
    /// </summary>
    public static class RoleDefinitions
    {
        /// <summary>
        /// Full Control - Has full control.
        /// </summary>
        public const string FullControl = "Full Control";

        /// <summary>
        /// Design - Can view, add, update, delete, approve, and customize.
        /// </summary>
        public const string Design = "Design";

        /// <summary>
        /// Edit - Can add, edit and delete lists; can view, add, update and delete list items and documents.
        /// </summary>
        public const string Edit = "Edit";

        /// <summary>
        /// Contribute - Can view, add, update, and delete list items and documents.
        /// </summary>
        public const string Contribute = "Contribute";

        /// <summary>
        /// Contribute Without Delete - Can view, add, and update list items and documents.
        /// This is a custom permission level that may need to be created in SharePoint.
        /// </summary>
        public const string ContributeWithoutDelete = "Contribute Without Delete";

        /// <summary>
        /// Read - Can view pages and list items and download documents.
        /// </summary>
        public const string Read = "Read";

        /// <summary>
        /// View Only - Can view pages, list items, and documents.
        /// Document types with server-side file handlers can be viewed in the browser but not downloaded.
        /// </summary>
        public const string ViewOnly = "View Only";

        /// <summary>
        /// Limited Access - Can view specific lists, document libraries, list items,
        /// folders, or documents when given permissions.
        /// </summary>
        public const string LimitedAccess = "Limited Access";
    }
}
