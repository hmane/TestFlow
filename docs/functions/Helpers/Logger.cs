// =============================================================================
// Legal Workflow - Azure Functions
// Logger.cs - Centralized logging utility for Azure Functions
// =============================================================================

using System;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace LegalWorkflow.Functions.Helpers
{
    /// <summary>
    /// Centralized logging utility for Legal Workflow Azure Functions.
    /// Provides structured logging with consistent formatting and context.
    /// Wraps the ILogger interface with additional functionality for
    /// request tracking, performance monitoring, and audit trails.
    /// </summary>
    public class Logger
    {
        private readonly ILogger _logger;
        private readonly string _functionName;
        private readonly Dictionary<string, object> _context;

        /// <summary>
        /// Creates a new Logger instance for a specific Azure Function.
        /// </summary>
        /// <param name="logger">The ILogger instance from Azure Functions</param>
        /// <param name="functionName">Name of the function for context</param>
        public Logger(ILogger logger, string functionName)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _functionName = functionName;
            _context = new Dictionary<string, object>
            {
                ["FunctionName"] = functionName,
                ["Timestamp"] = DateTime.UtcNow
            };
        }

        /// <summary>
        /// Sets the request context for all subsequent log entries.
        /// Should be called at the start of processing a request.
        /// </summary>
        /// <param name="requestId">SharePoint list item ID</param>
        /// <param name="requestTitle">Request ID (e.g., "LRQ-2024-001234")</param>
        public void SetRequestContext(int requestId, string requestTitle)
        {
            _context["RequestId"] = requestId;
            _context["RequestTitle"] = requestTitle;
        }

        /// <summary>
        /// Sets user context for permission operations.
        /// </summary>
        /// <param name="userEmail">Email of the user being processed</param>
        /// <param name="userLoginName">Login name in claims format</param>
        public void SetUserContext(string userEmail, string? userLoginName = null)
        {
            _context["UserEmail"] = userEmail;
            if (!string.IsNullOrEmpty(userLoginName))
            {
                _context["UserLoginName"] = userLoginName;
            }
        }

        /// <summary>
        /// Logs an informational message.
        /// Use for general operational information.
        /// </summary>
        /// <param name="message">Log message</param>
        /// <param name="data">Optional additional data to include</param>
        public void Info(string message, object? data = null)
        {
            Log(LogLevel.Information, message, data);
        }

        /// <summary>
        /// Logs a debug message.
        /// Use for detailed diagnostic information during development.
        /// </summary>
        /// <param name="message">Log message</param>
        /// <param name="data">Optional additional data to include</param>
        public void Debug(string message, object? data = null)
        {
            Log(LogLevel.Debug, message, data);
        }

        /// <summary>
        /// Logs a warning message.
        /// Use for potentially harmful situations or unexpected but handled conditions.
        /// </summary>
        /// <param name="message">Log message</param>
        /// <param name="data">Optional additional data to include</param>
        public void Warning(string message, object? data = null)
        {
            Log(LogLevel.Warning, message, data);
        }

        /// <summary>
        /// Logs an error message with exception details.
        /// Use when an error occurs that prevents normal operation.
        /// </summary>
        /// <param name="message">Log message</param>
        /// <param name="exception">The exception that occurred</param>
        /// <param name="data">Optional additional data to include</param>
        public void Error(string message, Exception? exception = null, object? data = null)
        {
            var errorData = new Dictionary<string, object>();

            if (data != null)
            {
                foreach (var prop in data.GetType().GetProperties())
                {
                    var value = prop.GetValue(data);
                    if (value != null)
                    {
                        errorData[prop.Name] = value;
                    }
                }
            }

            if (exception != null)
            {
                errorData["ExceptionType"] = exception.GetType().Name;
                errorData["ExceptionMessage"] = exception.Message;
                errorData["StackTrace"] = exception.StackTrace ?? string.Empty;

                if (exception.InnerException != null)
                {
                    errorData["InnerException"] = exception.InnerException.Message;
                }
            }

            Log(LogLevel.Error, message, errorData);
        }

        /// <summary>
        /// Logs the start of an operation for performance tracking.
        /// Returns a PerformanceTracker that should be disposed when the operation completes.
        /// </summary>
        /// <param name="operationName">Name of the operation being tracked</param>
        /// <returns>A PerformanceTracker to track the operation duration</returns>
        public PerformanceTracker StartOperation(string operationName)
        {
            Info($"Starting operation: {operationName}");
            return new PerformanceTracker(this, operationName);
        }

        /// <summary>
        /// Logs a permission change for audit trail.
        /// </summary>
        /// <param name="action">Type of permission action</param>
        /// <param name="target">Target of the permission change</param>
        /// <param name="principal">User or group affected</param>
        /// <param name="permissionLevel">Permission level applied</param>
        public void LogPermissionChange(string action, string target, string principal, string? permissionLevel = null)
        {
            var data = new
            {
                Action = action,
                Target = target,
                Principal = principal,
                PermissionLevel = permissionLevel,
                AuditType = "PermissionChange"
            };

            Info($"Permission change: {action} - {principal} on {target}", data);
        }

        /// <summary>
        /// Logs a notification event for audit trail.
        /// </summary>
        /// <param name="notificationId">ID of the notification template</param>
        /// <param name="trigger">What triggered the notification</param>
        /// <param name="recipients">List of recipient emails</param>
        /// <param name="sent">Whether the notification was sent</param>
        /// <param name="reason">Reason for sending or not sending</param>
        public void LogNotification(string notificationId, string trigger, List<string> recipients, bool sent, string reason)
        {
            var data = new
            {
                NotificationId = notificationId,
                Trigger = trigger,
                Recipients = string.Join(", ", recipients),
                RecipientCount = recipients.Count,
                Sent = sent,
                Reason = reason,
                AuditType = "Notification"
            };

            if (sent)
            {
                Info($"Notification sent: {notificationId} to {recipients.Count} recipients", data);
            }
            else
            {
                Info($"Notification skipped: {notificationId} - {reason}", data);
            }
        }

        /// <summary>
        /// Logs a status change for workflow tracking.
        /// </summary>
        /// <param name="previousStatus">Previous request status</param>
        /// <param name="newStatus">New request status</param>
        /// <param name="changedBy">User who made the change (if known)</param>
        public void LogStatusChange(string previousStatus, string newStatus, string? changedBy = null)
        {
            var data = new
            {
                PreviousStatus = previousStatus,
                NewStatus = newStatus,
                ChangedBy = changedBy ?? "Unknown",
                AuditType = "StatusChange"
            };

            Info($"Status changed: {previousStatus} → {newStatus}", data);
        }

        /// <summary>
        /// Internal logging method that combines context with message data.
        /// </summary>
        private void Log(LogLevel level, string message, object? data)
        {
            var logEntry = new Dictionary<string, object>(_context)
            {
                ["Message"] = message,
                ["LogLevel"] = level.ToString(),
                ["Timestamp"] = DateTime.UtcNow.ToString("O")
            };

            // Add any additional data
            if (data != null)
            {
                foreach (var prop in data.GetType().GetProperties())
                {
                    var value = prop.GetValue(data);
                    if (value != null)
                    {
                        logEntry[prop.Name] = value;
                    }
                }
            }

            // Log as structured JSON
            var jsonLog = JsonSerializer.Serialize(logEntry, new JsonSerializerOptions
            {
                WriteIndented = false
            });

            switch (level)
            {
                case LogLevel.Debug:
                    _logger.LogDebug("{LogEntry}", jsonLog);
                    break;
                case LogLevel.Information:
                    _logger.LogInformation("{LogEntry}", jsonLog);
                    break;
                case LogLevel.Warning:
                    _logger.LogWarning("{LogEntry}", jsonLog);
                    break;
                case LogLevel.Error:
                    _logger.LogError("{LogEntry}", jsonLog);
                    break;
                default:
                    _logger.LogInformation("{LogEntry}", jsonLog);
                    break;
            }
        }
    }

    /// <summary>
    /// Tracks the duration of an operation for performance monitoring.
    /// Implements IDisposable to automatically log completion when disposed.
    /// </summary>
    public class PerformanceTracker : IDisposable
    {
        private readonly Logger _logger;
        private readonly string _operationName;
        private readonly DateTime _startTime;
        private bool _disposed;

        /// <summary>
        /// Creates a new PerformanceTracker.
        /// </summary>
        /// <param name="logger">The Logger instance to use</param>
        /// <param name="operationName">Name of the operation being tracked</param>
        public PerformanceTracker(Logger logger, string operationName)
        {
            _logger = logger;
            _operationName = operationName;
            _startTime = DateTime.UtcNow;
        }

        /// <summary>
        /// Marks the operation as completed and logs the duration.
        /// </summary>
        /// <param name="success">Whether the operation was successful</param>
        /// <param name="message">Optional completion message</param>
        public void Complete(bool success = true, string? message = null)
        {
            if (_disposed) return;

            var duration = DateTime.UtcNow - _startTime;
            var data = new
            {
                OperationName = _operationName,
                DurationMs = duration.TotalMilliseconds,
                DurationSeconds = duration.TotalSeconds,
                Success = success
            };

            var logMessage = message ?? $"Completed operation: {_operationName}";
            if (success)
            {
                _logger.Info($"{logMessage} (Duration: {duration.TotalMilliseconds:F0}ms)", data);
            }
            else
            {
                _logger.Warning($"{logMessage} - FAILED (Duration: {duration.TotalMilliseconds:F0}ms)", data);
            }

            _disposed = true;
        }

        /// <summary>
        /// Disposes the tracker and logs completion if not already done.
        /// </summary>
        public void Dispose()
        {
            if (!_disposed)
            {
                Complete();
            }
            GC.SuppressFinalize(this);
        }
    }
}
