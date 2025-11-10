/**
 * Complete SAR Resource Additions Data
 * Contains all Phase 2A+ and Middle East 5-star resources
 */

module.exports = {
  // Phase 2A+ Asia-Pacific Coast Guards (8)
  asiaPacificCoastGuards: [
    {
      id: "taiwan-coastguard",
      name: "Taiwan Coast Guard Administration",
      nativeName: "海洋委員會海巡署",
      region: "Pacific - Taiwan",
      rcc: {
        name: "Taiwan Coast Guard HQ",
        location: "Taipei, Taiwan",
        coordinates: [25.0330, 121.5654],
        timezone: "Asia/Taipei"
      },
      contact: {
        phone: "+886-2-2239-9201",
        vhf: "Channel 16",
        emergency: "118",
        website: "https://www.cga.gov.tw",
        languages: ["Mandarin", "English"]
      },
      coverage: {
        latitude: [21.5, 26.0],
        longitude: [118.0, 122.5],
        description: "Taiwan Strait, critical shipping lane"
      },
      assets: {
        helicopters: 12,
        patrolVessels: 148,
        aircraft: 8
      },
      capabilities: ["SAR", "helicopter", "Taiwan Strait patrol", "fisheries", "maritime security"],
      operatingHours: "24/7",
      responseTime: 18
    },
    {
      id: "thailand-marine-police",
      name: "Royal Thai Marine Police",
      nativeName: "ตำรวจน้ำ",
      region: "Pacific - Thailand",
      rcc: {
        name: "Marine Police Division HQ",
        location: "Bangkok, Thailand",
        coordinates: [13.7563, 100.5018],
        timezone: "Asia/Bangkok"
      },
      contact: {
        phone: "+66-2-237-1199",
        vhf: "Channel 16",
        emergency: "191",
        website: "https://www.royalthaipolice.go.th",
        languages: ["Thai", "English"]
      },
      coverage: {
        latitude: [5.5, 20.5],
        longitude: [97.0, 106.0],
        description: "Gulf of Thailand, Andaman Sea"
      },
      assets: {
        helicopters: 4,
        patrolBoats: 86,
        stations: 42
      },
      capabilities: ["SAR", "maritime law enforcement", "tourist rescue", "fisheries patrol"],
      operatingHours: "24/7",
      responseTime: 25
    },
    {
      id: "vietnam-coastguard",
      name: "Vietnam Coast Guard",
      nativeName: "Cảnh sát biển Việt Nam",
      region: "Pacific - Vietnam",
      rcc: {
        name: "Vietnam Coast Guard Command",
        location: "Hanoi, Vietnam",
        coordinates: [21.0285, 105.8542],
        timezone: "Asia/Ho_Chi_Minh"
      },
      contact: {
        phone: "+84-24-3733-4338",
        vhf: "Channel 16",
        emergency: "113",
        website: "https://www.csb.gov.vn",
        languages: ["Vietnamese", "English"]
      },
      coverage: {
        latitude: [8.0, 23.5],
        longitude: [102.0, 114.0],
        description: "South China Sea, Gulf of Tonkin"
      },
      assets: {
        helicopters: 6,
        patrolVessels: 92,
        aircraft: 4
      },
      capabilities: ["SAR", "fisheries enforcement", "sovereignty patrol", "disaster response"],
      operatingHours: "24/7",
      responseTime: 30
    },
    {
      id: "malaysia-mmea",
      name: "Malaysian Maritime Enforcement Agency",
      nativeName: "Agensi Penguatkuasaan Maritim Malaysia",
      region: "Pacific - Malaysia",
      rcc: {
        name: "MMEA Operations Centre",
        location: "Putrajaya, Malaysia",
        coordinates: [2.9264, 101.6964],
        timezone: "Asia/Kuala_Lumpur"
      },
      contact: {
        phone: "+60-3-8000-8000",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.mmea.gov.my",
        languages: ["Malay", "English"]
      },
      coverage: {
        latitude: [0.5, 7.5],
        longitude: [99.0, 119.5],
        description: "Straits of Malacca, South China Sea"
      },
      assets: {
        helicopters: 8,
        patrolVessels: 156,
        aircraft: 6,
        stations: 28
      },
      capabilities: ["SAR", "helicopter", "Malacca Strait patrol", "anti-piracy", "maritime security"],
      operatingHours: "24/7",
      responseTime: 22
    },
    {
      id: "bangladesh-coastguard",
      name: "Bangladesh Coast Guard",
      nativeName: "বাংলাদেশ কোস্ট গার্ড",
      region: "Indian Ocean - Bangladesh",
      rcc: {
        name: "Coast Guard HQ",
        location: "Dhaka, Bangladesh",
        coordinates: [23.8103, 90.4125],
        timezone: "Asia/Dhaka"
      },
      contact: {
        phone: "+880-2-9123456",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.coastguard.gov.bd",
        languages: ["Bengali", "English"]
      },
      coverage: {
        latitude: [20.5, 26.5],
        longitude: [88.0, 93.0],
        description: "Bay of Bengal, river mouths"
      },
      assets: {
        helicopters: 2,
        patrolVessels: 46,
        stations: 12
      },
      capabilities: ["SAR", "disaster response", "fisheries patrol", "anti-smuggling"],
      operatingHours: "24/7",
      responseTime: 35
    },
    {
      id: "srilanka-navy",
      name: "Sri Lanka Navy Search and Rescue",
      nativeName: "ශ්‍රී ලංකා නාවික හමුදාව",
      region: "Indian Ocean - Sri Lanka",
      rcc: {
        name: "Naval HQ Colombo",
        location: "Colombo, Sri Lanka",
        coordinates: [6.9271, 79.8612],
        timezone: "Asia/Colombo"
      },
      contact: {
        phone: "+94-11-244-0369",
        vhf: "Channel 16",
        emergency: "119",
        website: "https://www.navy.lk",
        languages: ["Sinhala", "Tamil", "English"]
      },
      coverage: {
        latitude: [5.5, 10.0],
        longitude: [79.0, 82.0],
        description: "Sri Lankan waters, Indian Ocean"
      },
      assets: {
        helicopters: 8,
        patrolVessels: 72,
        fastAttackCraft: 28
      },
      capabilities: ["SAR", "helicopter", "disaster relief", "fisheries patrol", "anti-smuggling"],
      operatingHours: "24/7",
      responseTime: 28
    },
    {
      id: "pakistan-maritime",
      name: "Pakistan Maritime Security Agency",
      nativeName: "پاکستان میری ٹائم سیکیورٹی ایجنسی",
      region: "Indian Ocean - Pakistan",
      rcc: {
        name: "PMSA Operations Centre",
        location: "Karachi, Pakistan",
        coordinates: [24.8607, 67.0011],
        timezone: "Asia/Karachi"
      },
      contact: {
        phone: "+92-21-9921-3601",
        vhf: "Channel 16",
        emergency: "1122",
        website: "https://www.pmsa.gov.pk",
        languages: ["Urdu", "English"]
      },
      coverage: {
        latitude: [23.0, 28.0],
        longitude: [61.0, 68.5],
        description: "Arabian Sea, Pakistan EEZ"
      },
      assets: {
        helicopters: 6,
        patrolVessels: 32,
        aircraft: 3
      },
      capabilities: ["SAR", "maritime security", "fisheries patrol", "anti-smuggling"],
      operatingHours: "24/7",
      responseTime: 32
    },
    {
      id: "hongkong-marine",
      name: "Hong Kong Marine Police",
      nativeName: "香港水警",
      region: "Pacific - Hong Kong",
      rcc: {
        name: "Marine Police HQ",
        location: "Hong Kong",
        coordinates: [22.3193, 114.1694],
        timezone: "Asia/Hong_Kong"
      },
      contact: {
        phone: "+852-2866-3333",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.police.gov.hk",
        languages: ["Cantonese", "English"]
      },
      coverage: {
        latitude: [22.0, 22.6],
        longitude: [113.8, 114.5],
        description: "Hong Kong waters, Pearl River Delta"
      },
      assets: {
        helicopters: 0,
        patrolBoats: 142,
        stations: 9
      },
      capabilities: ["SAR", "harbor patrol", "anti-smuggling", "security"],
      operatingHours: "24/7",
      responseTime: 15
    }
  ],

  // Phase 2A+ Middle East Coast Guards (4)
  middleEastPhase2a: [
    {
      id: "uae-coastguard",
      name: "UAE Coast Guard",
      nativeName: "خفر السواحل الإماراتي",
      region: "Persian Gulf - UAE",
      rcc: {
        name: "UAE Coast Guard Operations",
        location: "Abu Dhabi, UAE",
        coordinates: [24.4539, 54.3773],
        timezone: "Asia/Dubai"
      },
      contact: {
        phone: "+971-2-446-2222",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.uaecg.gov.ae",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [22.5, 26.0],
        longitude: [51.0, 56.5],
        description: "UAE waters, Persian Gulf, Strait of Hormuz approaches"
      },
      assets: {
        helicopters: 8,
        patrolVessels: 68,
        aircraft: 4
      },
      capabilities: ["SAR", "helicopter", "port security", "anti-smuggling", "oil spill"],
      operatingHours: "24/7",
      responseTime: 20
    },
    {
      id: "saudi-borderguard",
      name: "Saudi Border Guard Marine Division",
      nativeName: "حرس الحدود السعودي",
      region: "Red Sea/Persian Gulf - Saudi Arabia",
      rcc: {
        name: "Border Guard HQ",
        location: "Riyadh, Saudi Arabia",
        coordinates: [24.7136, 46.6753],
        timezone: "Asia/Riyadh"
      },
      contact: {
        phone: "+966-11-404-3333",
        vhf: "Channel 16",
        emergency: "911",
        website: "https://www.bg.gov.sa",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [16.0, 30.0],
        longitude: [34.0, 55.0],
        description: "Red Sea, Persian Gulf, extensive coastline"
      },
      assets: {
        helicopters: 16,
        patrolVessels: 185,
        aircraft: 12,
        stations: 42
      },
      capabilities: ["SAR", "helicopter", "border security", "anti-smuggling", "pilgrimage support"],
      operatingHours: "24/7",
      responseTime: 25
    },
    {
      id: "oman-coastguard",
      name: "Royal Oman Police Coast Guard",
      nativeName: "خفر السواحل العماني",
      region: "Arabian Sea/Persian Gulf - Oman",
      rcc: {
        name: "Coast Guard Operations Centre",
        location: "Muscat, Oman",
        coordinates: [23.5880, 58.3829],
        timezone: "Asia/Muscat"
      },
      contact: {
        phone: "+968-24-560-099",
        vhf: "Channel 16",
        emergency: "9999",
        website: "https://www.rop.gov.om",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [16.0, 26.5],
        longitude: [52.0, 60.0],
        description: "Strait of Hormuz, Arabian Sea, strategic position"
      },
      assets: {
        helicopters: 6,
        patrolVessels: 54,
        aircraft: 4
      },
      capabilities: ["SAR", "helicopter", "strait monitoring", "anti-piracy", "fisheries"],
      operatingHours: "24/7",
      responseTime: 22
    },
    {
      id: "qatar-coastguard",
      name: "Qatar Coast Guard",
      nativeName: "خفر السواحل القطري",
      region: "Persian Gulf - Qatar",
      rcc: {
        name: "Coast Guard Command",
        location: "Doha, Qatar",
        coordinates: [25.2854, 51.5310],
        timezone: "Asia/Qatar"
      },
      contact: {
        phone: "+974-4488-8888",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.moi.gov.qa",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [24.5, 26.5],
        longitude: [50.5, 52.0],
        description: "Qatar waters, Persian Gulf"
      },
      assets: {
        helicopters: 4,
        patrolVessels: 38,
        aircraft: 2
      },
      capabilities: ["SAR", "helicopter", "port security", "LNG facility protection"],
      operatingHours: "24/7",
      responseTime: 18
    }
  ],

  // Phase 2A+ Americas Coast Guards (3)
  americasPhase2a: [
    {
      id: "brazil-navy-sar",
      name: "Brazilian Navy SAR - SALVAMAR",
      nativeName: "SALVAMAR Brasil",
      region: "Atlantic - Brazil",
      rcc: {
        name: "SALVAMAR Brasil",
        location: "Brasília, Brazil",
        coordinates: [-15.7939, -47.8828],
        timezone: "America/Sao_Paulo"
      },
      contact: {
        phone: "+55-21-2104-5454",
        vhf: "Channel 16",
        emergency: "185",
        website: "https://www.marinha.mil.br",
        languages: ["Portuguese", "English"]
      },
      coverage: {
        latitude: [-34.0, 5.0],
        longitude: [-54.0, -32.0],
        description: "Brazilian coast, extensive Atlantic SAR region"
      },
      assets: {
        helicopters: 24,
        patrolVessels: 156,
        aircraft: 18,
        stations: 28
      },
      capabilities: ["SAR", "helicopter", "Amazon operations", "offshore oil support", "Antarctica"],
      operatingHours: "24/7",
      responseTime: 30
    },
    {
      id: "mexican-navy-sar",
      name: "Mexican Navy SAR - SEMAR",
      nativeName: "SEMAR México",
      region: "Pacific/Gulf - Mexico",
      rcc: {
        name: "SEMAR Operations Centre",
        location: "Mexico City, Mexico",
        coordinates: [19.4326, -99.1332],
        timezone: "America/Mexico_City"
      },
      contact: {
        phone: "+52-55-5624-6500",
        vhf: "Channel 16",
        emergency: "911",
        website: "https://www.gob.mx/semar",
        languages: ["Spanish", "English"]
      },
      coverage: {
        latitude: [14.5, 32.7],
        longitude: [-118.0, -86.0],
        description: "Pacific coast, Gulf of Mexico, Caribbean"
      },
      assets: {
        helicopters: 32,
        patrolVessels: 228,
        aircraft: 24,
        stations: 36
      },
      capabilities: ["SAR", "helicopter", "drug interdiction", "migrant rescue", "hurricane response"],
      operatingHours: "24/7",
      responseTime: 25
    },
    {
      id: "argentine-prefecture",
      name: "Argentine Naval Prefecture",
      nativeName: "Prefectura Naval Argentina",
      region: "Atlantic - Argentina",
      rcc: {
        name: "MRCC Buenos Aires",
        location: "Buenos Aires, Argentina",
        coordinates: [-34.6037, -58.3816],
        timezone: "America/Argentina/Buenos_Aires"
      },
      contact: {
        phone: "+54-11-4346-3333",
        vhf: "Channel 16",
        emergency: "106",
        website: "https://www.argentina.gob.ar/prefecturanaval",
        languages: ["Spanish", "English"]
      },
      coverage: {
        latitude: [-55.0, -21.0],
        longitude: [-73.0, -53.0],
        description: "Argentine coast, Patagonia, South Atlantic"
      },
      assets: {
        helicopters: 12,
        patrolVessels: 86,
        aircraft: 8,
        stations: 24
      },
      capabilities: ["SAR", "helicopter", "Antarctic support", "fisheries patrol", "river operations"],
      operatingHours: "24/7",
      responseTime: 35
    }
  ],

  // Middle East 5-Star Additional Coast Guards (8)
  middleEast5Star: [
    {
      id: "iran-coastguard",
      name: "Iranian Coast Guard",
      nativeName: "گارد ساحلی ایران",
      region: "Persian Gulf/Gulf of Oman - Iran",
      rcc: {
        name: "IRGC Navy Command",
        location: "Bandar Abbas, Iran",
        coordinates: [27.1865, 56.2808],
        timezone: "Asia/Tehran"
      },
      contact: {
        phone: "+98-76-3333-3333",
        vhf: "Channel 16",
        emergency: "110",
        languages: ["Persian", "English"]
      },
      coverage: {
        latitude: [25.0, 40.0],
        longitude: [48.0, 63.0],
        description: "Persian Gulf, Strait of Hormuz, Caspian Sea"
      },
      assets: {
        helicopters: 18,
        patrolVessels: 284,
        fastBoats: 156
      },
      capabilities: ["SAR", "strait monitoring", "fisheries", "oil platform support"],
      operatingHours: "24/7",
      responseTime: 20
    },
    {
      id: "iraq-coastguard",
      name: "Iraqi Coast Guard",
      nativeName: "خفر السواحل العراقي",
      region: "Persian Gulf - Iraq",
      rcc: {
        name: "Coast Guard Command",
        location: "Basra, Iraq",
        coordinates: [30.5084, 47.7838],
        timezone: "Asia/Baghdad"
      },
      contact: {
        phone: "+964-40-123-4567",
        vhf: "Channel 16",
        emergency: "115",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [29.0, 31.0],
        longitude: [47.5, 49.0],
        description: "Shatt al-Arab, northern Persian Gulf"
      },
      assets: {
        helicopters: 2,
        patrolBoats: 24,
        stations: 4
      },
      capabilities: ["SAR", "port security", "oil platform protection"],
      operatingHours: "24/7",
      responseTime: 30
    },
    {
      id: "kuwait-coastguard",
      name: "Kuwait Coast Guard",
      nativeName: "خفر السواحل الكويتي",
      region: "Persian Gulf - Kuwait",
      rcc: {
        name: "Coast Guard Operations",
        location: "Kuwait City, Kuwait",
        coordinates: [29.3759, 47.9774],
        timezone: "Asia/Kuwait"
      },
      contact: {
        phone: "+965-2224-3333",
        vhf: "Channel 16",
        emergency: "112",
        website: "https://www.moi.gov.kw",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [28.5, 30.1],
        longitude: [46.5, 49.0],
        description: "Kuwait Bay, northern Persian Gulf"
      },
      assets: {
        helicopters: 6,
        patrolVessels: 42,
        aircraft: 2
      },
      capabilities: ["SAR", "helicopter", "oil spill", "port security"],
      operatingHours: "24/7",
      responseTime: 18
    },
    {
      id: "bahrain-coastguard",
      name: "Bahrain Coast Guard",
      nativeName: "خفر السواحل البحريني",
      region: "Persian Gulf - Bahrain",
      rcc: {
        name: "Coast Guard Command",
        location: "Manama, Bahrain",
        coordinates: [26.2285, 50.5860],
        timezone: "Asia/Bahrain"
      },
      contact: {
        phone: "+973-1772-2222",
        vhf: "Channel 16",
        emergency: "999",
        website: "https://www.interior.gov.bh",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [25.5, 26.5],
        longitude: [50.0, 51.0],
        description: "Bahrain waters, central Persian Gulf"
      },
      assets: {
        helicopters: 4,
        patrolVessels: 28,
        fastBoats: 16
      },
      capabilities: ["SAR", "helicopter", "coalition support", "anti-smuggling"],
      operatingHours: "24/7",
      responseTime: 15
    },
    {
      id: "yemen-coastguard",
      name: "Yemen Coast Guard",
      nativeName: "خفر السواحل اليمني",
      region: "Red Sea/Gulf of Aden - Yemen",
      rcc: {
        name: "Coast Guard Operations",
        location: "Aden, Yemen",
        coordinates: [12.7797, 45.0369],
        timezone: "Asia/Aden"
      },
      contact: {
        phone: "+967-2-374-444",
        vhf: "Channel 16",
        emergency: "194",
        languages: ["Arabic"]
      },
      coverage: {
        latitude: [12.0, 19.0],
        longitude: [42.0, 54.0],
        description: "Red Sea, Gulf of Aden, Bab el-Mandeb"
      },
      assets: {
        helicopters: 2,
        patrolBoats: 18,
        stations: 6
      },
      capabilities: ["SAR", "anti-piracy patrol", "fisheries"],
      operatingHours: "24/7",
      responseTime: 45
    },
    {
      id: "jordan-coastguard",
      name: "Jordanian Coast Guard",
      nativeName: "خفر السواحل الأردني",
      region: "Red Sea - Jordan",
      rcc: {
        name: "Aqaba Coast Guard Station",
        location: "Aqaba, Jordan",
        coordinates: [29.5267, 35.0066],
        timezone: "Asia/Amman"
      },
      contact: {
        phone: "+962-3-201-4444",
        vhf: "Channel 16",
        emergency: "911",
        languages: ["Arabic", "English"]
      },
      coverage: {
        latitude: [29.4, 29.6],
        longitude: [34.9, 35.1],
        description: "Gulf of Aqaba, limited Red Sea access"
      },
      assets: {
        helicopters: 1,
        patrolBoats: 8,
        stations: 2
      },
      capabilities: ["SAR", "port security", "tourist area patrol"],
      operatingHours: "24/7",
      responseTime: 20
    },
    {
      id: "lebanese-navy",
      name: "Lebanese Navy SAR",
      nativeName: "البحرية اللبنانية",
      region: "Mediterranean - Lebanon",
      rcc: {
        name: "Naval Base Beirut",
        location: "Beirut, Lebanon",
        coordinates: [33.8886, 35.4955],
        timezone: "Asia/Beirut"
      },
      contact: {
        phone: "+961-1-445-888",
        vhf: "Channel 16",
        emergency: "112",
        languages: ["Arabic", "French", "English"]
      },
      coverage: {
        latitude: [33.0, 34.7],
        longitude: [35.1, 36.6],
        description: "Lebanese waters, Eastern Mediterranean"
      },
      assets: {
        helicopters: 2,
        patrolBoats: 24,
        stations: 5
      },
      capabilities: ["SAR", "port security", "fisheries patrol"],
      operatingHours: "24/7",
      responseTime: 25
    },
    {
      id: "israeli-navy-sar",
      name: "Israeli Navy Search and Rescue",
      nativeName: "חיל הים הישראלי",
      region: "Mediterranean - Israel",
      rcc: {
        name: "Naval Base Haifa",
        location: "Haifa, Israel",
        coordinates: [32.8191, 34.9983],
        timezone: "Asia/Jerusalem"
      },
      contact: {
        phone: "+972-4-856-7777",
        vhf: "Channel 16",
        emergency: "100",
        website: "https://www.idf.il",
        languages: ["Hebrew", "English", "Arabic"]
      },
      coverage: {
        latitude: [29.5, 33.3],
        longitude: [34.2, 35.2],
        description: "Israeli waters, Eastern Mediterranean, Red Sea (Eilat)"
      },
      assets: {
        helicopters: 12,
        patrolVessels: 64,
        submarines: 5
      },
      capabilities: ["SAR", "helicopter", "submarine rescue", "offshore gas platform security"],
      operatingHours: "24/7",
      responseTime: 18
    }
  ]
};
