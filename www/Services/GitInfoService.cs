using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Cc.Net.Dto;
using CC.Net.Config;
using CC.Net.Utils;
using LibGit2Sharp;
using Microsoft.Extensions.Logging;

namespace CC.Net.Services
{
    public class GitInfoService
    {
        private AppOptions _appOptions;

        private ILogger<GitInfoService> _logger;

        public Repository _repo { get; }

        public Dictionary<string, GitInfo> _commits { get; }
        public FrontendConfig FrontendConfig { get; set; }

        public GitInfoService(AppOptions appOptions, ILogger<GitInfoService> logger)
        {
            _appOptions = appOptions;
            _logger = logger;
            /*
            var project = appOptions.Projects.First();
            var location = new DirectoryInfo(
                Path.Combine(".", "..", ".tmp", $".{project.Name.ToLower()}.gitinfo")
            ).FullName;

            Console.WriteLine($"processing project {project.Name}");

            if (!Repository.IsValid(location))
            {
                Console.WriteLine($"Cloning repository {project.Url} to {location}");
                Repository.Clone(project.Url, location);
            }

            Console.WriteLine($"Reading repo {location}");
            _repo = new Repository(location);
            Console.WriteLine($"fetching");
            string logMessage = "";
            Console.WriteLine(logMessage);

            _commits = new Dictionary<string, GitInfo>();
            foreach (var branch in _repo.Branches)
            {
                //  Console.WriteLine($"Reading branch {branch}");
                var branchName = branch.FriendlyName;
                branchName = branchName.StartsWith("origin/") ? branchName.Substring(7) : branchName;

                var current = branch.Tip;
                _commits[current.Id.Sha] = GitInfo.From(current, branchName);

                while(current != null && current.Parents.Count() == 1) {
                    current = current.Parents.First();
                    _commits[current.Id.Sha] = GitInfo.From(current, branchName);
                }
            }*/
        }

        public FrontendConfig SetupProjects()
        {
            foreach(var project in _appOptions.Projects)
            {
                _logger.LogInformation("Processing project {project} ({url})", project.Name, project.Url);
                var location = new DirectoryInfo(Path.Combine(".", "..", ".tmp", $".{project.Name.ToLower()}.gitinfo")).FullName;

                if (!Repository.IsValid(location))
                {
                    _logger.LogInformation("Cloning repository {project} to {url}", project.Name, project.Url);
                    Repository.Clone(project.Url, location);
                }

                _logger.LogInformation("Reading repo {location}", location);

                if (project.Name == "bench_data")
                {
                    var configYaml = Path.Combine(location, "cihpc", "frontend-config.yaml");
                    if (File.Exists(configYaml))
                    {
                        FrontendConfig = YamlRead.Read<FrontendConfig>(configYaml);
                    }
                }
            }
            return FrontendConfig;
        }

        public GitInfo Get(string sha)
        {
            var cmt = (Commit) _repo.Lookup(new ObjectId(sha));
            return _commits.GetValueOrDefault(sha, GitInfo.From(cmt, "--uknown--"));
        }
    }
}