# CS 260 Notes

## AWS

Name of my app: https://kynectra.net/
Subdirectories: simon.kynectra.net, startup.kynectra.net

## Linux Commands

chmod: change file permissions

pwd: print working directory

cd: change directory

ls: list files in a directory

vim, nano: text editors

mkdir: make a new directory

mv: move or rename files

rm: remove files

man: show manual for a command

ssh: connect to a remote server (secure shell)

ps: show running processes

wget: download files from the internet

sudo: run a command as the superuser

## DNS and Networking

A DNS A record maps a domain name to an IP address.

A record cannot point to another A record (it must point to an IP).

CNAME records point to another domain name.

### Example:

Top-level domain (TLD): .com

Root domain: kynectra.com

Subdomain: simon.skynectra.com

Port 443 = HTTPS

Port 80 = HTTP

Port 22 = SSH

HTTPS requires a web certificate for encryption.

## HTML

Normal HTML stuff, you got header tags, link tags, etc. etc. Syntax for different things: img src="pathToImageHere" class="nameOfClassHere" alt="SomethingReplacingItHere" 

## CSS

To style a class use ".". To style an ID use "#". To use grid do the whole "display: grid;" and then use either "grid-template-columns" or "grid-template-rows" with fractions of space after to define stuff, can also use fixed sizes. 


## React Part 1: Routing
React uses components to build the frontend.

Use JSX for combining HTML and JS.

Routing with react-router-dom (e.g. <BrowserRouter>, <Route>, <Link>).

Used mainly for frontend display — making things look nice.

Can use props to pass data into components.

## React Part 2: Reactivity

const add = (a, b) => a + b;

Objects:
const person = { name: "Alex", age: 20 };
- You can add new properties: person.height = 180; (itll automatically add in the field)

const nums = [1, 2, 3];
nums.map(n => console.log(n));
(this'll automatically loop through and print out everything)

Syntax Examples
if (x > 5) { ... }
else { ... }
for (let i = 0; i < 5; i++) { ... }
while (x < 10) { ... }
switch (num) {
  case 1: ...
}


Use useState() to store values that change.

Use useEffect() for side effects like fetching or logging.

Syntax Example:
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  console.log("Simulated API call, new count:", count + 1);
}

JSON Example:
{ "animal": "crow", "fish": "salmon" }