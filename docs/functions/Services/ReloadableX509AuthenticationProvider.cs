// =============================================================================
// Legal Workflow - Azure Functions
// ReloadableX509AuthenticationProvider.cs - Reloadable certificate auth provider
// =============================================================================

using System;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;
using Azure.Identity;
using Azure.Security.KeyVault.Certificates;
using Microsoft.Extensions.Logging;
using PnP.Core.Auth;
using PnP.Core.Services;

namespace LegalWorkflow.Functions.Services
{
    /// <summary>
    /// Wraps PnP Core certificate authentication and allows the backing
    /// certificate to be refreshed from Key Vault without restarting the host.
    /// </summary>
    public class ReloadableX509AuthenticationProvider : IAuthenticationProvider
    {
        private readonly string _clientId;
        private readonly string _tenantId;
        private readonly string _certificateName;
        private readonly CertificateClient _certificateClient;
        private readonly ILogger<ReloadableX509AuthenticationProvider> _logger;
        private readonly SemaphoreSlim _refreshLock = new(1, 1);

        private volatile IAuthenticationProvider? _innerProvider;
        private volatile CertificateLoadInfo? _currentCertificate;
        private volatile bool _initialized;

        public ReloadableX509AuthenticationProvider(
            string clientId,
            string tenantId,
            string keyVaultUrl,
            string certificateName,
            ILogger<ReloadableX509AuthenticationProvider> logger)
        {
            _clientId = clientId ?? throw new ArgumentNullException(nameof(clientId));
            _tenantId = tenantId ?? throw new ArgumentNullException(nameof(tenantId));
            _certificateName = certificateName ?? throw new ArgumentNullException(nameof(certificateName));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            if (string.IsNullOrWhiteSpace(keyVaultUrl))
            {
                throw new ArgumentException("Key Vault URL is required", nameof(keyVaultUrl));
            }

            _certificateClient = new CertificateClient(new Uri(keyVaultUrl), new DefaultAzureCredential());
            // Certificate is loaded lazily on first use via EnsureInitializedAsync()
        }

        /// <summary>
        /// Gets metadata about the currently loaded certificate.
        /// Returns null if the certificate has not been loaded yet.
        /// </summary>
        public CertificateLoadInfo? CurrentCertificate => _currentCertificate;

        public async Task AuthenticateRequestAsync(Uri resource, HttpRequestMessage request)
        {
            await EnsureInitializedAsync();
            await _innerProvider!.AuthenticateRequestAsync(resource, request);
        }

        public async Task<string> GetAccessTokenAsync(Uri resource)
        {
            await EnsureInitializedAsync();
            return await _innerProvider!.GetAccessTokenAsync(resource);
        }

        public async Task<string> GetAccessTokenAsync(Uri resource, string[] scopes)
        {
            await EnsureInitializedAsync();
            return await _innerProvider!.GetAccessTokenAsync(resource, scopes);
        }

        /// <summary>
        /// Ensures the certificate is loaded from Key Vault before first use.
        /// Uses double-check locking to avoid redundant loads.
        /// </summary>
        private async Task EnsureInitializedAsync()
        {
            if (_initialized) return;

            await _refreshLock.WaitAsync();
            try
            {
                if (_initialized) return;
                (_innerProvider, _currentCertificate) = await CreateAuthenticationProviderAsync();
                _initialized = true;
            }
            finally
            {
                _refreshLock.Release();
            }
        }

        /// <summary>
        /// Reloads the certificate from Key Vault and swaps the active auth provider.
        /// </summary>
        public async Task<CertificateRefreshResult> RefreshAsync(CancellationToken cancellationToken = default)
        {
            await _refreshLock.WaitAsync(cancellationToken);

            try
            {
                var previous = _currentCertificate;
                var (provider, current) = await CreateAuthenticationProviderAsync();

                _innerProvider = provider;
                _currentCertificate = current;
                _initialized = true;

                _logger.LogInformation(
                    "Reloaded certificate cache from Key Vault. Previous thumbprint suffix: {PreviousThumbprintSuffix}, new thumbprint suffix: {CurrentThumbprintSuffix}, expires on: {ExpiresOnUtc}",
                    previous?.ThumbprintSuffix ?? "none",
                    current.ThumbprintSuffix,
                    current.ExpiresOnUtc);

                return new CertificateRefreshResult
                {
                    Previous = previous ?? new CertificateLoadInfo(),
                    Current = current,
                    RefreshedAtUtc = DateTime.UtcNow
                };
            }
            finally
            {
                _refreshLock.Release();
            }
        }

        private async Task<(IAuthenticationProvider Provider, CertificateLoadInfo Info)> CreateAuthenticationProviderAsync()
        {
            var certificate = await DownloadCertificateAsync();
            var info = CertificateLoadInfo.FromCertificate(certificate, DateTime.UtcNow);
            var provider = new X509CertificateAuthenticationProvider(_clientId, _tenantId, certificate);

            _logger.LogInformation(
                "Loaded certificate from Key Vault. Subject: {Subject}, thumbprint suffix: {ThumbprintSuffix}, expires on: {ExpiresOnUtc}",
                info.Subject,
                info.ThumbprintSuffix,
                info.ExpiresOnUtc);

            var daysUntilExpiry = (info.ExpiresOnUtc - DateTime.UtcNow).TotalDays;
            if (daysUntilExpiry <= 30)
            {
                _logger.LogWarning(
                    "Certificate is expiring soon! Subject: {Subject}, thumbprint suffix: {ThumbprintSuffix}, expires on: {ExpiresOnUtc} ({DaysUntilExpiry:F0} days remaining)",
                    info.Subject,
                    info.ThumbprintSuffix,
                    info.ExpiresOnUtc,
                    daysUntilExpiry);
            }

            return (provider, info);
        }

        private async Task<X509Certificate2> DownloadCertificateAsync()
        {
            var response = await _certificateClient.DownloadCertificateAsync(_certificateName);
            return response.Value;
        }
    }

    /// <summary>
    /// Metadata about a loaded certificate.
    /// </summary>
    public class CertificateLoadInfo
    {
        public string Subject { get; set; } = string.Empty;

        public string ThumbprintSuffix { get; set; } = string.Empty;

        public DateTime LoadedAtUtc { get; set; }

        public DateTime ExpiresOnUtc { get; set; }

        public static CertificateLoadInfo FromCertificate(X509Certificate2 certificate, DateTime loadedAtUtc)
        {
            if (certificate == null)
            {
                throw new ArgumentNullException(nameof(certificate));
            }

            var thumbprint = certificate.Thumbprint ?? string.Empty;
            var suffix = thumbprint.Length <= 8 ? thumbprint : thumbprint[^8..];

            return new CertificateLoadInfo
            {
                Subject = certificate.Subject ?? string.Empty,
                ThumbprintSuffix = suffix,
                LoadedAtUtc = loadedAtUtc,
                ExpiresOnUtc = certificate.NotAfter.ToUniversalTime()
            };
        }
    }

    /// <summary>
    /// Result of a certificate refresh operation.
    /// </summary>
    public class CertificateRefreshResult
    {
        public CertificateLoadInfo Previous { get; set; } = new();

        public CertificateLoadInfo Current { get; set; } = new();

        public DateTime RefreshedAtUtc { get; set; }
    }
}
