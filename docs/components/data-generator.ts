// Data for generating music library
const artists = [
  'Queen', 'Pink Floyd', 'The Beatles', 'Led Zeppelin', 'AC/DC', 'Metallica', 'Nirvana',
  'Bob Dylan', 'Elvis Presley', 'Michael Jackson', 'Madonna', 'David Bowie', 'Prince',
  'U2', 'Radiohead', 'Coldplay', 'Arctic Monkeys', 'Red Hot Chili Peppers', 'Foo Fighters',
  'Linkin Park', 'Green Day', 'The Rolling Stones', 'The Who', 'Black Sabbath', 'Deep Purple',
  'Iron Maiden', 'Judas Priest', "Guns N' Roses", 'Aerosmith', 'Van Halen', 'Kiss',
  'Def Leppard', 'Bon Jovi', 'Journey', 'Foreigner', 'Toto', 'Chicago', 'Boston',
  'Eagles', 'Fleetwood Mac', 'Stevie Nicks', 'Joni Mitchell', 'Carole King', 'Aretha Franklin',
  'Whitney Houston', 'Mariah Carey', 'Celine Dion', 'Adele', 'Amy Winehouse', 'Billie Eilish',
  'Taylor Swift', 'Ed Sheeran', 'Bruno Mars', 'The Weeknd', 'Drake', 'Kanye West',
  'Jay-Z', 'Eminem', '50 Cent', 'Snoop Dogg', 'Dr. Dre', 'Tupac', 'Notorious B.I.G.',
  'Kendrick Lamar', 'J. Cole', 'Travis Scott', 'Post Malone', 'Juice WRLD', 'XXXTentacion',
  'Miles Davis', 'John Coltrane', 'Louis Armstrong', 'Duke Ellington', 'Ella Fitzgerald',
  'Frank Sinatra', 'Tony Bennett', 'Nat King Cole', 'Billie Holiday', 'Nina Simone',
  'B.B. King', 'Muddy Waters', 'Robert Johnson', 'Eric Clapton', 'Jimi Hendrix',
  'Stevie Ray Vaughan', 'Carlos Santana', 'Jeff Beck', 'Jimmy Page', 'Keith Richards',
  'Johnny Cash', 'Willie Nelson', 'Dolly Parton', 'Garth Brooks', 'Shania Twain',
  'Carrie Underwood', 'Keith Urban', 'Blake Shelton', 'Luke Bryan', 'Florida Georgia Line',
  'Manca Špik', 'Katalena', 'Magnifico', 'Vlado Kreslin', 'Big Foot Mama', 'Siddharta',
];

const titles = [
  'Bohemian Rhapsody', 'Stairway to Heaven', 'Hotel California', "Sweet Child O' Mine",
  'Imagine', 'Like a Rolling Stone', 'Satisfaction', 'Hey Jude', 'Purple Haze',
  'Smells Like Teen Spirit', 'Billie Jean', 'Thriller', 'Beat It', 'Smooth Criminal',
  "Don't Stop Believin'", 'We Will Rock You', 'We Are the Champions', 'Another Brick in the Wall',
  'Comfortably Numb', 'Wish You Were Here', 'Money', 'Time', 'Breathe', 'Us and Them',
  'Kashmir', 'Black Dog', 'Whole Lotta Love', 'Rock and Roll', 'Going to California',
  'Thunderstruck', 'Highway to Hell', 'Back in Black', 'You Shook Me All Night Long',
  'Enter Sandman', 'Master of Puppets', 'One', 'Nothing Else Matters', 'Fade to Black',
  'Come As You Are', 'In Bloom', 'Lithium', 'Heart-Shaped Box', 'About a Girl',
  "Blowin' in the Wind", "The Times They Are a-Changin'", 'Mr. Tambourine Man',
  'All Along the Watchtower', "Knockin' on Heaven's Door", 'Like a Prayer',
  'Material Girl', 'Vogue', "Papa Don't Preach", 'Crazy for You', 'Holiday',
  'Space Oddity', 'Heroes', "Let's Dance", 'Under Pressure', 'Changes', 'Rebel Rebel',
  'Purple Rain', 'Kiss', 'When Doves Cry', '1999', 'Little Red Corvette', "Sign O' the Times",
  'With or Without You', 'Where the Streets Have No Name', 'One', 'Sunday Bloody Sunday',
  'Beautiful Day', "I Still Haven't Found What I'm Looking For", 'Pride', 'Vertigo',
  'Creep', 'Paranoid Android', 'Karma Police', 'No Surprises', 'High and Dry',
  'Yellow', 'The Scientist', 'Clocks', 'Fix You', 'Viva La Vida', 'Paradise',
  'Do I Wanna Know?', 'R U Mine?', "Why'd You Only Call Me When You're High?",
  'I Bet You Look Good on the Dancefloor', 'Fluorescent Adolescent', '505',
  'Orion', 'B Mashina', 'Kekec', 'Sanjam', 'Samo ljubezen', 'Nocoj je moja noč',
];

const genres = [
  'Rock', 'Pop', 'Hip Hop', 'R&B', 'Country', 'Jazz', 'Blues', 'Electronic', 'Dance',
  'Alternative', 'Indie', 'Punk', 'Metal', 'Hard Rock', 'Classic Rock', 'Progressive Rock',
  'Folk', 'Reggae', 'Funk', 'Soul', 'Gospel', 'Classical', 'Opera', 'World Music',
  'Latin', 'Salsa', 'Bossa Nova', 'Flamenco', 'Tango', 'Mariachi', 'Cumbia',
  'Techno', 'House', 'Trance', 'Dubstep', 'Drum and Bass', 'Ambient', 'Chillout',
  'New Age', 'Meditation', 'Experimental', 'Avant-garde', 'Noise', 'Industrial',
  'Grunge', 'Emo', 'Screamo', 'Post-hardcore', 'Metalcore', 'Death Metal', 'Black Metal',
  'Power Metal', 'Speed Metal', 'Thrash Metal', 'Progressive Metal', 'Symphonic Metal',
  'Ska', 'Rocksteady', 'Dub', 'Dancehall', 'Afrobeat', 'Highlife', 'Soukous',
  'Klezmer', 'Polka', 'Waltz', 'Tango', 'Swing', 'Bebop', 'Cool Jazz', 'Free Jazz',
];

const moods = [
  'Energetic', 'Chill', 'Romantic', 'Melancholic', 'Happy', 'Sad', 'Angry', 'Peaceful',
  'Nostalgic', 'Uplifting', 'Dark', 'Mysterious', 'Playful', 'Serious', 'Dreamy',
  'Intense', 'Relaxing', 'Motivational', 'Emotional', 'Fun', 'Dramatic', 'Ethereal',
  'Groovy', 'Funky', 'Smooth', 'Raw', 'Polished', 'Atmospheric', 'Cinematic',
  'Party', 'Focus', 'Study', 'Workout', 'Sleep', 'Morning', 'Evening', 'Night',
  'Summer', 'Winter', 'Spring', 'Autumn', 'Rain', 'Sunshine', 'Road Trip', 'Beach',
];

const languages = [
  'English', 'Slovenian', 'German', 'Italian', 'French', 'Spanish',
  'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic',
  'Hebrew', 'Hindi', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
  'Dutch', 'Polish', 'Czech', 'Slovak', 'Hungarian', 'Romanian',
  'Bulgarian', 'Serbian', 'Croatian', 'Bosnian', 'Macedonian', 'Albanian',
  'Greek', 'Turkish', 'Persian', 'Urdu', 'Bengali', 'Tamil',
  'Instrumental', 'Mixed', 'Latin',
];

// Function to randomly select an element from array
function randomChoice(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Function to randomly select multiple elements from array
function randomChoices(arr: string[], min: number = 1, max: number = 4) {
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  const choices = [];
  const used = new Set();

  while (choices.length < num && choices.length < arr.length) {
    const choice = randomChoice(arr);
    if (!used.has(choice)) {
      choices.push(choice);
      used.add(choice);
    }
  }

  return choices;
}

// Function to generate random duration
function randomDuration() {
  if (Math.random() < 0.7) {
    // Song (2-8 minutes)
    const minutes = Math.floor(Math.random() * 6) + 2;
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  // Album (30-90 minutes)
  const minutes = Math.floor(Math.random() * 60) + 30;
  const seconds = Math.floor(Math.random() * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Function to generate n records
// eslint-disable-next-line import/prefer-default-export
export function generateMusicLibrary(count: number = 1000) {
  const musicLibrary = [];

  for (let i = 0; i < count; i++) {
    const record = {
      id: i + 1,
      title: randomChoice(titles),
      artist: randomChoice(artists),
      year: Math.floor(Math.random() * 70) + 1954, // 1954-2024
      duration: randomDuration(),
      genres: randomChoices(genres, 1, 3),
      rating: Math.floor(Math.random() * 5) + 1, // 1-5
      favorite: Math.random() < 0.3, // 30% chance
      play_count: Math.floor(Math.random() * 10000), // 0-9999
      moods: randomChoices(moods, 1, 4),
      language: randomChoice(languages),
    };

    musicLibrary.push(record);
  }

  return musicLibrary;
}

export const languagesMap = languages.map((language) => {
    return {
      text: language,
      id: language,
    };
  }
);

// Usage:
// const data = generateMusicLibrary(1000);
// console.log(data);
