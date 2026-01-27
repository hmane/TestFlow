// =============================================================================
// Legal Workflow - Azure Functions
// SharePointGroups.cs - SharePoint group name constants
// =============================================================================
//
// This file contains default constants for SharePoint group names.
// These can be overridden via configuration (Permissions:* settings).
//
// IMPORTANT: Keep these values in sync with the SPFx solution:
//   - src/sp/Groups.ts
// =============================================================================

namespace LegalWorkflow.Functions.Constants
{
    /// <summary>
    /// Default SharePoint group names for the Legal Workflow application.
    /// These are the default values; actual values should be loaded from configuration.
    /// </summary>
    public static class SharePointGroups
    {
        /// <summary>
        /// System administrators with full access.
        /// </summary>
        public const string Admin = "LW - Admin";

        /// <summary>
        /// Users who can submit legal review requests.
        /// </summary>
        public const string Submitters = "LW - Submitters";

        /// <summary>
        /// Legal administrators who can manage all requests.
        /// </summary>
        public const string LegalAdmin = "LW - Legal Admin";

        /// <summary>
        /// Users who can assign attorneys to requests.
        /// </summary>
        public const string AttorneyAssigner = "LW - Attorney Assigner";

        /// <summary>
        /// Attorneys who can review and approve legal requests.
        /// </summary>
        public const string Attorneys = "LW - Attorneys";

        /// <summary>
        /// Compliance users who can review compliance aspects.
        /// </summary>
        public const string ComplianceUsers = "LW - Compliance Users";
    }
}
