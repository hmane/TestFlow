// =============================================================================
// Legal Workflow - Azure Functions
// SharePointListConfig.cs - Runtime-configurable SharePoint list names
// =============================================================================
//
// These names are read from application settings so that non-default list titles
// (e.g. in parallel test sites) can be configured without recompiling.
// Values must match the actual SharePoint list titles in the target site.
// =============================================================================

using LegalWorkflow.Functions.Constants;

namespace LegalWorkflow.Functions.Models
{
    /// <summary>
    /// Holds the SharePoint list and library names used at runtime.
    /// All services that perform SharePoint data access use this config so that
    /// the SharePoint:* settings in local.settings.json / Application Settings
    /// are actually honoured (rather than silently ignored in favour of constants).
    /// </summary>
    public class SharePointListConfig
    {
        /// <summary>
        /// Title of the Requests list.
        /// Config key: SharePoint:RequestsListName
        /// </summary>
        public string RequestsListName { get; set; } = SharePointLists.Requests;

        /// <summary>
        /// Title of the Notifications list that stores email templates.
        /// Config key: SharePoint:NotificationsListName
        /// </summary>
        public string NotificationsListName { get; set; } = SharePointLists.Notifications;

        /// <summary>
        /// Title of the document library used to store request attachments.
        /// Config key: SharePoint:DocumentsLibraryName
        /// </summary>
        public string DocumentsLibraryName { get; set; } = SharePointLists.RequestDocuments;
    }
}
