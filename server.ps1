param(
    [int]$Port = 4173,
    [switch]$OpenBrowser
)

$source = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

public static class LocalStaticServer
{
    private static string root;
    private static readonly Dictionary<string, string> Mime = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".js", "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".svg", "image/svg+xml" },
        { ".ico", "image/x-icon" }
    };

    public static void Run(string directory, int port, bool openBrowser)
    {
        root = Path.GetFullPath(directory);
        var listener = new TcpListener(IPAddress.Loopback, port);
        listener.Start();
        Console.WriteLine("Iron Front is running at http://127.0.0.1:" + port);
        Console.WriteLine("Press Ctrl+C to stop the server.");

        if (openBrowser)
        {
            try
            {
                var url = "http://127.0.0.1:" + port;
                var chromeCandidates = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe")
                };
                string chrome = null;
                foreach (var candidate in chromeCandidates)
                {
                    if (File.Exists(candidate)) { chrome = candidate; break; }
                }
                var info = chrome == null
                    ? new System.Diagnostics.ProcessStartInfo(url)
                    : new System.Diagnostics.ProcessStartInfo(chrome, url);
                info.UseShellExecute = true;
                System.Diagnostics.Process.Start(info);
            }
            catch { }
        }

        while (true)
        {
            var client = listener.AcceptTcpClient();
            ThreadPool.QueueUserWorkItem(HandleClient, client);
        }
    }

    private static void HandleClient(object state)
    {
        using (var client = (TcpClient)state)
        {
            try
            {
                client.ReceiveTimeout = 3000;
                client.SendTimeout = 3000;
                using (var stream = client.GetStream())
                using (var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true))
                {
                    var requestLine = reader.ReadLine();
                    if (String.IsNullOrWhiteSpace(requestLine)) return;
                    string line;
                    while (!String.IsNullOrEmpty(line = reader.ReadLine())) { }

                    var parts = requestLine.Split(' ');
                    if (parts.Length < 2) return;
                    var path = parts[1].Split('?')[0];
                    if (path == "/") path = "/index.html";
                    path = Uri.UnescapeDataString(path).TrimStart('/').Replace('/', Path.DirectorySeparatorChar);

                    var file = Path.GetFullPath(Path.Combine(root, path));
                    var allowed = file.Equals(root, StringComparison.OrdinalIgnoreCase) ||
                                  file.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);

                    byte[] body;
                    string status;
                    string contentType;
                    if (!allowed || !File.Exists(file))
                    {
                        body = Encoding.UTF8.GetBytes("404 Not Found");
                        status = "404 Not Found";
                        contentType = "text/plain; charset=utf-8";
                    }
                    else
                    {
                        body = File.ReadAllBytes(file);
                        status = "200 OK";
                        var extension = Path.GetExtension(file);
                        contentType = Mime.ContainsKey(extension) ? Mime[extension] : "application/octet-stream";
                    }

                    var header = "HTTP/1.1 " + status + "\r\n" +
                                 "Content-Type: " + contentType + "\r\n" +
                                 "Content-Length: " + body.Length + "\r\n" +
                                 "Cache-Control: no-cache\r\n" +
                                 "Connection: close\r\n\r\n";
                    var headerBytes = Encoding.ASCII.GetBytes(header);
                    stream.Write(headerBytes, 0, headerBytes.Length);
                    stream.Write(body, 0, body.Length);
                    stream.Flush();
                }
            }
            catch { }
        }
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp
[LocalStaticServer]::Run($PSScriptRoot, $Port, $OpenBrowser.IsPresent)
