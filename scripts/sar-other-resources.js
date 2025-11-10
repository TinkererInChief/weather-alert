// Additional SAR Resources - Ports, Salvage, Lifeboats, etc.
module.exports = {
  ports: [
    {id:"port-rotterdam",name:"Port of Rotterdam",location:"Rotterdam, Netherlands",coordinates:[51.9244,4.4777],contact:{phone:"+31-10-252-1111",vhf:"Channel 11",website:"https://www.portofrotterdam.com",emergency:"112"},operatingHours:"24/7",services:["harbor master","VTS","emergency"]},
    {id:"port-hamburg",name:"Hamburg Port Authority",location:"Hamburg, Germany",coordinates:[53.5438,9.9768],contact:{phone:"+49-40-42847-0",vhf:"Channel 12",website:"https://www.hamburg-port-authority.de",emergency:"112"},operatingHours:"24/7",services:["harbor master","VTS"]},
    {id:"port-antwerp",name:"Antwerp Port Authority",location:"Antwerp, Belgium",coordinates:[51.2893,4.3108],contact:{phone:"+32-3-205-2011",vhf:"Channel 12",website:"https://www.portofantwerp.com",emergency:"112"},operatingHours:"24/7",services:["harbor master","VTS"]},
    {id:"port-panama",name:"Panama Maritime Authority",location:"Panama City",coordinates:[9.0820,-79.4170],contact:{phone:"+507-501-5000",vhf:"Channel 12",website:"https://www.amp.gob.pa",emergency:"911"},operatingHours:"24/7",services:["Panama Canal","VTS"]},
    {id:"port-suez",name:"Suez Canal Authority",location:"Ismailia, Egypt",coordinates:[30.5965,32.2715],contact:{phone:"+20-64-332-2450",vhf:"Channel 16",website:"https://www.suezcanal.gov.eg",emergency:"122"},operatingHours:"24/7",services:["canal transit","emergency"]},
    {id:"port-jebel-ali",name:"Jebel Ali Port",location:"Dubai",coordinates:[24.9931,55.0276],contact:{phone:"+971-4-881-5000",vhf:"Channel 14",emergency:"+971-4-881-5555"},operatingHours:"24/7",services:["container","VTS"]},
    {id:"port-haifa",name:"Port of Haifa",location:"Haifa, Israel",coordinates:[32.8192,34.9985],contact:{phone:"+972-4-852-1111",vhf:"Channel 12",emergency:"100"},operatingHours:"24/7",services:["harbor master","VTS"]}
  ],
  salvage: [
    {id:"svitzer",name:"Svitzer",location:"Copenhagen",coordinates:[55.6761,12.5683],contact:{phone:"+45-3363-2000",emergency:"+45-3363-2001",website:"https://www.svitzer.com"},fleet:[{vesselName:"Svitzer Fleet",bollardPull:180,type:"Tugs",capabilities:["towing","salvage"]}],region:"Global",responseTime:90,specializations:["emergency response","salvage"]},
    {id:"tsavliris",name:"Tsavliris Salvage",location:"Piraeus",coordinates:[37.9478,23.6480],contact:{phone:"+30-210-429-4780",emergency:"+30-210-429-4780",website:"https://www.tsavliris.com"},fleet:[{vesselName:"Christos XXIII",bollardPull:205,type:"Salvage Tug",capabilities:["salvage","wreck removal"]}],region:"Mediterranean",responseTime:80,specializations:["wreck removal","salvage"]},
    {id:"multraship",name:"Multraship Salvage",location:"Netherlands",coordinates:[51.3358,3.8270],contact:{phone:"+31-115-647-400",website:"https://www.multraship.com"},fleet:[{vesselName:"Multratug",bollardPull:195,type:"Salvage",capabilities:["North Sea"]}],region:"North Sea",responseTime:60,specializations:["salvage","offshore"]}
  ],
  lifeboat: [
    {id:"rnli",name:"RNLI",location:"Poole, UK",coordinates:[50.7128,-1.9877],contact:{phone:"+44-1202-663-000",emergency:"999",website:"https://rnli.org"},stations:238,volunteers:4600,region:"UK/Ireland",capabilities:["lifeboats","rescue"]},
    {id:"knrm",name:"KNRM",location:"Netherlands",coordinates:[52.4586,4.6250],contact:{phone:"+31-255-548-400",emergency:"112",website:"https://knrm.nl"},stations:45,volunteers:1250,region:"Netherlands",capabilities:["North Sea rescue"]}
  ],
  tsunami: [
    {id:"neamtws",organization:"NEAMTWS",location:"Athens",coordinates:[37.9838,23.7275],contact:{phone:"+30-210-349-4000",website:"http://www.koeri.boun.edu.tr/tsunami"},coverage:"NE Atlantic/Mediterranean",service:"Tsunami warnings",operatingHours:"24/7"},
    {id:"caribe-ews",organization:"CARIBE EWS",location:"Puerto Rico",coordinates:[18.3950,-66.1143],contact:{phone:"+1-787-833-8433",website:"http://www.caribewave.pr.gov"},coverage:"Caribbean",service:"Tsunami warnings",operatingHours:"24/7"}
  ],
  weather: [
    {id:"metoffice-marine",organization:"Met Office Marine",location:"Exeter, UK",coordinates:[50.7184,-3.5339],contact:{phone:"+44-370-900-0100",website:"https://www.metoffice.gov.uk/weather/specialist-forecasts/coast-and-sea"},coverage:"UK waters, Atlantic",services:["marine forecasts","storm warnings"]},
    {id:"meteofrance-marine",organization:"Météo-France Marine",location:"Toulouse",coordinates:[43.6047,1.4442],contact:{phone:"+33-5-67-69-70-00",website:"https://www.meteofrance.com"},coverage:"French waters",services:["marine forecasts","storm warnings"]}
  ]
};
