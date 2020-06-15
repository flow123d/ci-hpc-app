using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using cc.net.Collections.Shared;
using CC.Net.Collections;
using CC.Net.Dto;
using CC.Net.Extensions;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using TypeLite;
using TypeLite.TsModels;

namespace CC.Net
{
    public class Program
    {
        public static void Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--generate")
            {
                Directory.CreateDirectory("_client/src/models/");
                File.WriteAllText(
                    "_client/src/models/DataModel.d.ts",
                    TypeScript.Definitions()
                        .For<ColScheduler>()
                        .For<ColTimers>()
                        .For<SimpleTimer>()
                        .For<SimpleTimers>()
                        .For<SimpleTimersEx>()

                        .For<SchedulerFilter>()
                        .For<TimersFilter>()

                        .WithVisibility((a, b) => true)
                        .WithMemberTypeFormatter(MemberTypeFormatter)
                        .WithModuleNameFormatter((moduleName) => "")
                        .WithMemberFormatter((identifier) => 
                            Char.ToLower(identifier.Name[0]) + identifier.Name.Substring(1)
                        )
                        .WithTypeFormatter((type, f) => "I" + ((TsClass)type).Name)
                        .Generate());
                Environment.Exit(0);
            }

            CreateWebHostBuilder(args)
                .Build()
                .Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args)
        {
            var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.secret.json", optional: true)
            .AddCommandLine(args)
            .Build();

            return WebHost.CreateDefaultBuilder(args)
                .UseConfiguration(config)
                .UseStartup<Startup>();
        }

        public static string MemberTypeFormatter(TsProperty prop, string typeName) {
            /*if(typeName.Contains("IObjectId")) {
                typeName = "string";
            }*/

            return DefaultMemberTypeFormatter(prop, typeName);
        }

        public static string DefaultMemberTypeFormatter(TsProperty prop, string typeName) {
            var asCollection = prop.PropertyType as TsCollection;
            var isCollection = asCollection != null;

            return typeName + (isCollection ? string.Concat(Enumerable.Repeat("[]", asCollection.Dimension)) : "");
        }
    }
}