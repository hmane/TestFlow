// =============================================================================
// Legal Workflow - Azure Functions
// Program.cs - Application entry point with dependency injection configuration
// =============================================================================

using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PnP.Core.Auth.Services.Builder.Configuration;
using PnP.Core.Services.Builder.Configuration;
using LegalWorkflow.Functions.Helpers;
using LegalWorkflow.Functions.Models;
using LegalWorkflow.Functions.Services;

namespace LegalWorkflow.Functions
{
    /// <summary>
    /// Azure Functions application entry point.
    /// Configures dependency injection, PnP Core SDK, and logging.
    /// </summary>
    public class Program
    {
        public static void Main(string[] args)
        {
            var host = new HostBuilder()
                .ConfigureFunctionsWebApplication()
                .ConfigureAppConfiguration((context, config) =>
                {
                    // Add configuration sources
                    config.AddJsonFile("local.settings.json", optional: true, reloadOnChange: true);
                    config.AddEnvironmentVariables();
                })
                .ConfigureServices((context, services) =>
                {
                    var configuration = context.Configuration;

                    // Configure Application Insights telemetry
                    services.AddApplicationInsightsTelemetryWorkerService();
                    services.ConfigureFunctionsApplicationInsights();

                    // Register configuration as singleton
                    services.AddSingleton<IConfiguration>(configuration);

                    // Register Permission Group Configuration
                    services.AddSingleton(sp =>
                    {
                        return new PermissionGroupConfig
                        {
                            SubmittersGroup = configuration["Permissions:SubmittersGroup"] ?? "LW - Submitters",
                            LegalAdminGroup = configuration["Permissions:LegalAdminGroup"] ?? "LW - Legal Admin",
                            AttorneyAssignerGroup = configuration["Permissions:AttorneyAssignerGroup"] ?? "LW - Attorney Assigner",
                            AttorneysGroup = configuration["Permissions:AttorneysGroup"] ?? "LW - Attorneys",
                            ComplianceGroup = configuration["Permissions:ComplianceGroup"] ?? "LW - Compliance Users",
                            AdminGroup = configuration["Permissions:AdminGroup"] ?? "LW - Admin"
                        };
                    });

                    // Register Notification Configuration
                    services.AddSingleton(sp =>
                    {
                        return new NotificationConfig
                        {
                            SiteUrl = configuration["SharePoint:SiteUrl"] ?? string.Empty,
                            LegalAdminEmail = configuration["Notifications:LegalAdminEmail"] ?? string.Empty,
                            AttorneyAssignerEmail = configuration["Notifications:AttorneyAssignerEmail"] ?? string.Empty,
                            ComplianceEmail = configuration["Notifications:ComplianceEmail"] ?? string.Empty,
                            RequestsListName = configuration["SharePoint:RequestsListName"] ?? "Requests",
                            EnableDebugLogging = bool.TryParse(configuration["Notifications:EnableDebugLogging"], out var debug) && debug
                        };
                    });

                    // Configure PnP Core SDK for SharePoint access
                    ConfigurePnPCore(services, configuration);

                    // Configure logging
                    services.AddLogging(builder =>
                    {
                        builder.SetMinimumLevel(LogLevel.Information);
                        builder.AddFilter("Microsoft", LogLevel.Warning);
                        builder.AddFilter("System", LogLevel.Warning);
                        builder.AddFilter("LegalWorkflow", LogLevel.Debug);
                    });

                    // Add Memory Cache for authorization caching
                    services.AddMemoryCache();

                    // Register services
                    services.AddScoped<Logger>();
                    services.AddScoped<RequestService>();
                    services.AddScoped<PermissionService>();
                    services.AddScoped<NotificationService>();
                    services.AddScoped<SharePointAuthorizationService>();
                })
                .Build();

            host.Run();
        }

        /// <summary>
        /// Configures PnP Core SDK for SharePoint access.
        /// Supports both certificate and client secret authentication.
        /// </summary>
        private static void ConfigurePnPCore(IServiceCollection services, IConfiguration configuration)
        {
            var clientId = configuration["AzureAd:ClientId"];
            var tenantId = configuration["AzureAd:TenantId"];
            var clientSecret = configuration["AzureAd:ClientSecret"];
            var certThumbprint = configuration["AzureAd:CertificateThumbprint"];
            var siteUrl = configuration["SharePoint:SiteUrl"];

            // Configure PnP Core with retry/resilience settings
            services.AddPnPCore(options =>
            {
                options.DefaultAuthenticationProvider = new PnPCoreAuthenticationCredentialConfigurationOptions
                {
                    ClientId = clientId,
                    TenantId = tenantId
                };

                options.Sites.Add("Default", new PnPCoreSiteOptions
                {
                    SiteUrl = siteUrl
                });

                // Configure PnP Core global settings for retry and performance
                options.PnPContext = new PnPCoreContextOptions
                {
                    // GraphFirst: Use Microsoft Graph when possible (better performance)
                    GraphFirst = true,
                    // GraphCanUseBeta: Allow beta endpoints for features not in v1.0
                    GraphCanUseBeta = true,
                    // GraphAlwaysUseBeta: Don't force beta for everything
                    GraphAlwaysUseBeta = false
                };

                // Configure HTTP retry settings for SharePoint REST API
                options.HttpRequests = new PnPCoreHttpRequestsOptions
                {
                    // Timeout for individual HTTP requests (2 minutes)
                    Timeout = 120,
                    // User agent for tracking
                    UserAgent = "LegalWorkflow/1.0",
                    // SharePoint REST API throttling settings
                    SharePointRest = new PnPCoreHttpRequestsSharePointRestOptions
                    {
                        // Use retry-after header when throttled
                        UseRetryAfterHeader = true,
                        // Maximum retries for throttled requests (429, 503)
                        MaxRetries = 10,
                        // Delay between retries (in seconds) - uses exponential backoff
                        DelayInSeconds = 3,
                        // Use incremental delay (exponential backoff)
                        UseIncrementalDelay = true
                    },
                    // Microsoft Graph retry settings
                    MicrosoftGraph = new PnPCoreHttpRequestsMicrosoftGraphOptions
                    {
                        // Use retry-after header when throttled
                        UseRetryAfterHeader = true,
                        // Maximum retries for throttled requests
                        MaxRetries = 10,
                        // Delay between retries (in seconds)
                        DelayInSeconds = 3,
                        // Use incremental delay (exponential backoff)
                        UseIncrementalDelay = true
                    }
                };
            });

            // Add PnP Core authentication
            services.AddPnPCoreAuthentication(options =>
            {
                var credentialConfig = new PnPCoreAuthenticationCredentialConfigurationOptions
                {
                    ClientId = clientId,
                    TenantId = tenantId
                };

                // Use certificate if thumbprint is provided (production)
                // Otherwise use client secret (development)
                if (!string.IsNullOrEmpty(certThumbprint))
                {
                    // Certificate-based authentication for production
                    // Uncomment and configure as needed:
                    // credentialConfig.X509Certificate = new PnPCoreAuthenticationX509CertificateOptions
                    // {
                    //     StoreName = System.Security.Cryptography.X509Certificates.StoreName.My,
                    //     StoreLocation = System.Security.Cryptography.X509Certificates.StoreLocation.CurrentUser,
                    //     Thumbprint = certThumbprint
                    // };
                    credentialConfig.ClientSecret = clientSecret; // Fallback for now
                }
                else if (!string.IsNullOrEmpty(clientSecret))
                {
                    // Client secret authentication for development
                    credentialConfig.ClientSecret = clientSecret;
                }

                options.Credentials.Configurations.Add("Default", credentialConfig);
                options.Credentials.DefaultConfiguration = "Default";
            });
        }
    }
}
