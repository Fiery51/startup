//This'll just return fake data, this'll be the same structure im gonna attempt to make the actual real backend return

export const LOBBIES = [
  { id: 1, name: 'Sunset Hike @ Y-Mountain', tag: 'Outdoors', people: 6, max: 10, time: 'Today 7:30 PM', location: 'Provo, UT' },
  { id: 2, name: 'Board Games & Boba',       tag: 'Casual',   people: 3, max: 6,  time: 'Fri 8:00 PM',   location: 'Riv. Commons' },
  { id: 3, name: 'Pick-up Basketball',       tag: 'Sports',   people: 9, max: 12, time: 'Sat 10:00 AM',  location: 'RB Courts' },
  { id: 4, name: 'Study Session – CS260',    tag: 'Study',    people: 4, max: 8,  time: 'Sun 3:00 PM',   location: 'HBLL' },
  { id: 5, name: 'Pickleball',               tag: 'Sports',   people: 4, max: 4,  time: 'Mon 1:00 PM',   location: 'HBLL' },
  { id: 6, name: 'Study Session – CS235',    tag: 'Study',    people: 4, max: 8,  time: 'Tue 3:00 PM',   location: 'TNRB' },
];

export function fakeFetchLobbies() {
  return new Promise(resolve => setTimeout(() => resolve(LOBBIES), 550));
}