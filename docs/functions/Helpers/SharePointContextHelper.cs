// =============================================================================
// Legal Workflow - Azure Functions
// SharePointContextHelper.cs - Shared helpers for authenticated PnP contexts
// =============================================================================

using System;
using System.Threading.Tasks;
using LegalWorkflow.Functions.Models;
using PnP.Core.Services;

namespace LegalWorkflow.Functions.Helpers
{
    internal static class SharePointContextHelper
    {
        public static Uri GetRequiredSiteUri(SharePointListConfig listConfig)
        {
            ArgumentNullException.ThrowIfNull(listConfig);

            return Uri.TryCreate(listConfig.SiteUrl, UriKind.Absolute, out var siteUri)
                ? siteUri
                : throw new InvalidOperationException("SharePoint:SiteUrl is not configured with a valid absolute URL.");
        }

        public static Task<PnPContext> CreateContextAsync(
            IPnPContextFactory contextFactory,
            Uri siteUri,
            IAuthenticationProvider authenticationProvider)
        {
            ArgumentNullException.ThrowIfNull(contextFactory);
            ArgumentNullException.ThrowIfNull(siteUri);
            ArgumentNullException.ThrowIfNull(authenticationProvider);

            return contextFactory.CreateAsync(siteUri, authenticationProvider, new PnPContextOptions());
        }
    }
}
