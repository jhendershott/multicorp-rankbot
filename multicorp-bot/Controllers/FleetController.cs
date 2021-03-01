using multicorp_bot.Models;
using DSharpPlus.Entities;
using multicorp_bot.Helpers;
using multicorp_bot.Models;
using RestSharp;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace multicorp_bot.Controllers
{
    public class FleetController
    {
        MultiBotDb MultiBotDb;
        TelemetryHelper tHelper = new TelemetryHelper();
        public FleetController()
        {
            MultiBotDb = new MultiBotDb();
        }
        public DiscordEmbed GetFleetRequests(DiscordGuild guild)
        {
            DiscordEmbedBuilder builder = new DiscordEmbedBuilder();
            builder.Title = $"{guild.Name} Fleet Requests";
            builder.Timestamp = DateTime.Now;
            builder.Description = "The below lists are ships deemed imperative by command to advance the org";
            var fleetReqs = GetOrgFleetRequests(guild);
            foreach (var req in fleetReqs)
            {
                builder.AddField(req.Name, $"Req Id: {req.Id} Total Cost: {FormatHelpers.FormattedNumber(req.TotalPrice.ToString())} \n" +
                    $"Remaining Balance: {FormatHelpers.FormattedNumber(req.RemainingPrice.ToString())}");
            }
            Random rand = new Random();
            var imgNum = rand.Next(0, fleetReqs.Count);
            builder.ImageUrl = fleetReqs[imgNum].ImgUrl;
            builder.WithFooter("Only one image can be shown. The Image is chosen randomly from the list of reqested ships");
            return builder.Build();

        }

        public List<WantedShips> GetOrgFleetRequests(DiscordGuild guild)
        {
            return MultiBotDb.WantedShips.AsQueryable().Where(x => x.OrgId == new OrgController().GetOrgId(guild) && !x.IsCompleted).ToList();
        }

        public int CompleteFleetRequest(DiscordGuild guild)
        {
            var zeroBalanceShips = MultiBotDb.WantedShips.AsQueryable().Where(x => x.OrgId == new OrgController().GetOrgId(guild) && !x.IsCompleted && x.RemainingPrice == 0).ToList();
            foreach(var ship in zeroBalanceShips)
            {
                ship.IsCompleted = true;
                MultiBotDb.WantedShips.Update(ship);
            }

            MultiBotDb.SaveChanges();
            int test = zeroBalanceShips.Count();
            return zeroBalanceShips.Count();
        }

        public void AddFleetRequest(string name, int price, string imgUrl, DiscordGuild guild)
        {
            var request = new WantedShips()
            {
                Id = GetHighestRequestid() + 1,
                OrgId = new OrgController().GetOrgId(guild),
                Name = name,
                TotalPrice = price,
                RemainingPrice = price,
                ImgUrl = imgUrl
            };

            MultiBotDb.WantedShips.Add(request);
            MultiBotDb.SaveChanges();
        }

        public void UpdateFleetItemAmount(int fleetId, int amount)
        {
            var req = GetFleetReqById(fleetId);
            req.RemainingPrice = req.RemainingPrice - amount;
            MultiBotDb.WantedShips.Update(req);
            MultiBotDb.SaveChanges();
        }

        public WantedShips GetFleetReqById(int fleetId)
        {
            return MultiBotDb.WantedShips.AsQueryable().Where(x => x.Id == fleetId && !x.IsCompleted).FirstOrDefault();
        }

        [Obsolete]
        public List<FleetImport> GetLoanerFleet(List<FleetImport> fleet)
        {
            List<FleetImport> loaner = new List<FleetImport>();
            List<string> shipName = new List<string>();
            
            var client = new RestClient("https://sc-galaxy.com/");

            foreach(var ship in fleet)
            {
                shipName.Add(ship.Name);
            }

            BulkRequest bulk = new BulkRequest() { Names = shipName };

  
            var request = new RestRequest($"api/ships/bulk", Method.POST);
            request.RequestFormat = DataFormat.Json;
            request.AddParameter("application/json; charset=utf-8", bulk.ToJson(), ParameterType.RequestBody);

            try
            {
                var resp = client.Execute(request).Content;

                var flResp = FleetParse.FromJson(resp);

                foreach(var x in flResp)
                {
                    var flItem = fleet.Single(i => i.Name == x.Name);
                    if (x.ReadyStatus == "flight-ready")
                    {
                        var baseShip = new FleetImport();
                        baseShip.Cost = FormatHelpers.CostString((int)x.PledgeCost);
                        baseShip.Id = flItem.Id;
                        baseShip.InsuranceDuration = flItem.InsuranceDuration;
                        baseShip.InsuranceType = flItem.InsuranceType;
                        baseShip.Lti = flItem.Lti;
                        baseShip.Manufacturer = flItem.Manufacturer;
                        baseShip.MonthsInsurance = flItem.MonthsInsurance;
                        baseShip.Name = flItem.Name;
                        baseShip.PackageId = flItem.PackageId;
                        baseShip.Pledge = flItem.Pledge;
                        baseShip.PledgeDate = flItem.PledgeDate;
                        baseShip.Warbond = flItem.Warbond;

                        loaner.Add(baseShip);
                    }

                    if(x.LoanerShips.Count != 0)
                    {
                        foreach(var ship in x.LoanerShips)
                        {
                            var loanShip = new FleetImport();
                            loanShip.Cost = FormatHelpers.CostString((int)ship.Loaned.PledgeCost);
                            loanShip.Id = ship.Loaned.Id;
                            loanShip.InsuranceDuration = flItem.InsuranceDuration;
                            loanShip.InsuranceType = flItem.InsuranceType;
                            loanShip.Lti = flItem.Lti;
                            loanShip.Manufacturer = ship.Loaned.Chassis.Manufacturer.Name;
                            loanShip.MonthsInsurance = flItem.MonthsInsurance;
                            loanShip.Name = ship.Loaned.Name;
                            loanShip.PackageId = flItem.PackageId;
                            loanShip.Pledge = flItem.Pledge;
                            loanShip.PledgeDate = flItem.PledgeDate;
                            loanShip.Warbond = flItem.Warbond;

                            loaner.Add(loanShip);
                        }
                    }
                }

                var json = JsonConvert.SerializeObject(loaner);
                Console.WriteLine(json);
                
            }
            catch (Exception error)
            {
                Console.WriteLine(error);
            }

            

            return null;
        }



        private int GetHighestRequestid()
        {
            return MultiBotDb.WantedShips.ToList().OrderByDescending(x => x.Id).First().Id;
        }
    }
}
