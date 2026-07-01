// 30 users: Tennis(0-7), Cricket(8-15), Science(16-22), Movies(23-29)
module.exports = {
  users: [
    // Tennis
    { username:'arjun',     email:'arjun@demo.com',     password:'demo1234', displayName:'Arjun Sharma',    community:'Tennis'  },
    { username:'priya',     email:'priya@demo.com',     password:'demo1234', displayName:'Priya Nair',      community:'Tennis'  },
    { username:'rohan',     email:'rohan@demo.com',     password:'demo1234', displayName:'Rohan Mehta',     community:'Tennis'  },
    { username:'sneha',     email:'sneha@demo.com',     password:'demo1234', displayName:'Sneha Iyer',      community:'Tennis'  },
    { username:'vivek',     email:'vivek@demo.com',     password:'demo1234', displayName:'Vivek Kapoor',    community:'Tennis'  },
    { username:'tanvi',     email:'tanvi@demo.com',     password:'demo1234', displayName:'Tanvi Desai',     community:'Tennis'  },
    { username:'nikhil',    email:'nikhil@demo.com',    password:'demo1234', displayName:'Nikhil Rao',      community:'Tennis'  },
    { username:'ishaan',    email:'ishaan@demo.com',    password:'demo1234', displayName:'Ishaan Gupta',    community:'Tennis'  },
    // Cricket
    { username:'rahul',     email:'rahul@demo.com',     password:'demo1234', displayName:'Rahul Verma',     community:'Cricket' },
    { username:'kavya',     email:'kavya@demo.com',     password:'demo1234', displayName:'Kavya Reddy',     community:'Cricket' },
    { username:'ravi',      email:'ravi@demo.com',      password:'demo1234', displayName:'Ravi Shankar',    community:'Cricket' },
    { username:'meera',     email:'meera@demo.com',     password:'demo1234', displayName:'Meera Pillai',    community:'Cricket' },
    { username:'karan',     email:'karan@demo.com',     password:'demo1234', displayName:'Karan Malhotra',  community:'Cricket' },
    { username:'pooja',     email:'pooja@demo.com',     password:'demo1234', displayName:'Pooja Singh',     community:'Cricket' },
    { username:'aditya',    email:'aditya@demo.com',    password:'demo1234', displayName:'Aditya Joshi',    community:'Cricket' },
    { username:'sanya',     email:'sanya@demo.com',     password:'demo1234', displayName:'Sanya Khanna',    community:'Cricket' },
    // Science
    { username:'ananya',    email:'ananya@demo.com',    password:'demo1234', displayName:'Ananya Bose',     community:'Science' },
    { username:'siddharth', email:'siddharth@demo.com', password:'demo1234', displayName:'Siddharth Nath',  community:'Science' },
    { username:'divya',     email:'divya@demo.com',     password:'demo1234', displayName:'Divya Menon',     community:'Science' },
    { username:'kartik',    email:'kartik@demo.com',    password:'demo1234', displayName:'Kartik Pandey',   community:'Science' },
    { username:'nisha',     email:'nisha@demo.com',     password:'demo1234', displayName:'Nisha Tiwari',    community:'Science' },
    { username:'pranav',    email:'pranav@demo.com',    password:'demo1234', displayName:'Pranav Kulkarni', community:'Science' },
    { username:'ritika',    email:'ritika@demo.com',    password:'demo1234', displayName:'Ritika Ghosh',    community:'Science' },
    // Movies
    { username:'aarav',     email:'aarav@demo.com',     password:'demo1234', displayName:'Aarav Saxena',    community:'Movies'  },
    { username:'ishita',    email:'ishita@demo.com',    password:'demo1234', displayName:'Ishita Banerjee', community:'Movies'  },
    { username:'yash',      email:'yash@demo.com',      password:'demo1234', displayName:'Yash Oberoi',     community:'Movies'  },
    { username:'roohi',     email:'roohi@demo.com',     password:'demo1234', displayName:'Roohi Chawla',    community:'Movies'  },
    { username:'kabir',     email:'kabir@demo.com',     password:'demo1234', displayName:'Kabir Sethi',     community:'Movies'  },
    { username:'zara',      email:'zara@demo.com',      password:'demo1234', displayName:'Zara Qureshi',    community:'Movies'  },
    { username:'mihir',     email:'mihir@demo.com',     password:'demo1234', displayName:'Mihir Trivedi',   community:'Movies'  },
  ],
  relationships: [
    // Tennis internal
    [0,1,0.92],[0,2,0.88],[0,3,0.85],[1,2,0.78],[1,5,0.82],
    [2,3,0.90],[2,4,0.75],[3,4,0.70],[4,5,0.88],[4,6,0.72],
    [5,6,0.65],[5,7,0.80],[6,7,0.84],[0,7,0.60],[3,7,0.55],
    [2,6,0.18], // conflict: rohan vs nikhil
    // Cricket internal
    [8,9,0.91],[8,10,0.87],[8,11,0.80],[9,10,0.76],[9,12,0.82],
    [9,13,0.78],[10,11,0.85],[11,13,0.88],[11,14,0.72],[12,13,0.65],
    [12,14,0.70],[13,14,0.84],[13,15,0.79],[14,15,0.90],[8,15,0.62],
    [8,12,0.15], // conflict: rahul vs karan
    // Science internal (near-clique → echo chamber)
    [16,17,0.93],[16,18,0.89],[17,18,0.91],[17,19,0.78],[17,20,0.82],
    [18,19,0.87],[18,20,0.80],[18,21,0.76],[19,20,0.88],[19,21,0.83],
    [20,21,0.90],[20,22,0.79],[21,22,0.86],[16,22,0.71],[17,22,0.68],
    [16,19,0.22], // conflict: ananya vs kartik
    // Movies internal
    [23,24,0.89],[23,25,0.82],[23,26,0.77],[24,25,0.90],[24,26,0.85],
    [24,27,0.72],[25,26,0.78],[25,27,0.80],[26,27,0.83],[26,28,0.74],
    [27,28,0.88],[27,29,0.76],[28,29,0.92],[23,29,0.60],[25,29,0.65],
    [23,28,0.12], // conflict: aarav vs zara
    // Cross-community bridges
    [0,8,0.68],[0,10,0.72],[1,9,0.55],[6,14,0.45],   // Tennis↔Cricket
    [3,17,0.38],[7,20,0.32],                           // Tennis↔Science (weak)
    [1,24,0.80],[1,27,0.65],[5,26,0.48],               // Tennis↔Movies
    [10,17,0.75],[10,19,0.62],[8,22,0.40],             // Cricket↔Science
    [12,23,0.78],[12,25,0.70],[9,28,0.52],[15,29,0.44],// Cricket↔Movies
    [16,24,0.83],[16,27,0.68],[22,28,0.55],[21,29,0.42],// Science↔Movies
    // Cross-community conflicts
    [6,15,0.20],  // nikhil↔sanya (Tennis vs Cricket rivalry)
    [16,12,0.22], // ananya↔karan (Science vs Movies tension)
    [24,12,0.58], // ishita↔karan (bridge)
    [4,18,0.25],[7,21,0.28], // weak cross ties (declining)
  ],
  temporalWeights: {
    '0:1':  [0.90,0.91,0.92,0.91,0.93,0.92], // stable high
    '8:9':  [0.89,0.90,0.91,0.91,0.90,0.91], // stable
    '17:18':[0.90,0.92,0.91,0.93,0.91,0.91], // stable
    '27:28':[0.86,0.87,0.88,0.88,0.88,0.88], // stable
    '19:20':[0.87,0.88,0.88,0.89,0.88,0.88], // stable
    '13:14':[0.82,0.83,0.84,0.84,0.84,0.84], // stable
    '1:24': [0.50,0.57,0.63,0.70,0.76,0.80], // growing T+M bridge
    '10:17':[0.45,0.52,0.58,0.65,0.70,0.75], // growing C+S bridge
    '12:23':[0.55,0.60,0.65,0.70,0.74,0.78], // growing C+M bridge
    '16:24':[0.65,0.70,0.74,0.78,0.81,0.83], // growing S+M bridge
    '14:15':[0.72,0.78,0.82,0.86,0.88,0.90], // growing fast
    '24:25':[0.80,0.83,0.86,0.88,0.89,0.90], // growing
    '7:21': [0.60,0.54,0.48,0.38,0.30,0.28], // FAST DECLINE (high risk)
    '4:18': [0.50,0.44,0.38,0.30,0.26,0.25], // FAST DECLINE
    '3:17': [0.55,0.50,0.46,0.42,0.39,0.38], // medium decline
    '6:15': [0.40,0.34,0.28,0.24,0.21,0.20], // SHARP DECLINE (rivalry)
    '5:26': [0.65,0.60,0.54,0.49,0.48,0.48], // slow decline
    '0:7':  [0.75,0.70,0.65,0.62,0.61,0.60], // gradual decline
    '9:28': [0.68,0.62,0.57,0.53,0.52,0.52], // gradual decline
    '16:12':[0.45,0.38,0.31,0.26,0.23,0.22], // SHARP DECLINE (conflict)
    '2:3':  [0.90,0.82,0.68,0.72,0.84,0.90], // dip then recovery
    '11:13':[0.88,0.80,0.72,0.78,0.85,0.88], // dip then recovery
    '20:21':[0.92,0.88,0.80,0.76,0.84,0.90], // dip then recovery
    '0:8':  [0.75,0.73,0.71,0.70,0.69,0.68], // very slow decline
    '1:9':  [0.62,0.60,0.58,0.57,0.56,0.55], // very slow decline
    '4:6':  [0.72,0.78,0.68,0.76,0.70,0.72], // fluctuating
  },
};
