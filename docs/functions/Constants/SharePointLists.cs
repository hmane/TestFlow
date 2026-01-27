// =============================================================================
// Legal Workflow - Azure Functions
// SharePointLists.cs - SharePoint list name constants
// =============================================================================
//
// This file contains constants for SharePoint list names used throughout
// the Azure Functions. These values must match the actual SharePoint list
// titles in the Legal Workflow site.
//
// IMPORTANT: Keep these values in sync with the SPFx solution:
//   - src/sp/Lists.ts
// =============================================================================

namespace LegalWorkflow.Functions.Constants
{
    /// <summary>
    /// SharePoint list name constants.
    /// These must match the actual list titles in SharePoint.
    /// </summary>
    public static class SharePointLists
    {
        /// <summary>
        /// The main Requests list containing all legal review requests.
        /// </summary>
        public const string Requests = "Requests";

        /// <summary>
        /// The Notifications list containing email notification templates.
        /// </summary>
        public const string Notifications = "Notifications";

        /// <summary>
        /// The document library for request-related documents.
        /// </summary>
        public const string RequestDocuments = "RequestDocuments";

        /// <summary>
        /// The Configuration list for system settings.
        /// </summary>
        public const string Configuration = "Configuration";

        /// <summary>
        /// The SubmissionItems list for submission type configuration.
        /// </summary>
        public const string SubmissionItems = "SubmissionItems";

        /// <summary>
        /// The RequestIds list for ID generation.
        /// </summary>
        public const string RequestIds = "RequestIds";
    }
}
