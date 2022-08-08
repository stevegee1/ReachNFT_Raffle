import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

const runRaffle = async (numTickets) => { //The number of participants in the raffle is assumed to be equal to the number of tickets
  const startingBalanceA = stdlib.parseCurrency(1000);
  const startingBalanceB = stdlib.parseCurrency(100);

  console.log(`*     Creating the Alice Account     *`);

  const accAlice = await stdlib.newTestAccount(startingBalanceA);
  const ctcAlice = accAlice.contract(backend);

  console.log(`*     Creating the Bob Accounts     *`);

  const accBobs = await stdlib.newTestAccounts(numTickets, startingBalanceB);
  const ctcBobs = accBobs.map(B => B.contract(backend, ctcAlice.getInfo()));
  
  // creating a new token
  const supply = 1;

  const NFT = await stdlib.launchToken(accAlice,"Wukong","NFT",{ supply: supply});
  accBobs.map(B => B.tokenAccept(NFT));
  
  const params = {
    NFT: NFT.id,
    ticketAmount: numTickets
  }

  const ticketsPicked = [];

  const printBalances = async (numBobs) => {
    const printBalance = async (name, acc) => {
        const [balance, balance_NFT] = await stdlib.balancesOf(acc,[null, NFT]);
        console.log(`  [+] ${name} has ${fmt(balance)} ${stdlib.standardUnit} and ${balance_NFT} Wukong `);
    } 
    await printBalance('Alice', accAlice);
    for (let i = 0; i < numBobs; i++) {
        await printBalance(`Bob #${i+1}`, accBobs[i]);
    }
  }

  console.log("Starting balances:");
  await printBalances(numTickets);

  const giveTickets = async () => {
    
  }

  const checkWin = async () => {
    
  }

  // launch Contract
  console.log(`Starting Raffle...`)
  await ctcAlice.p.Alice({
    ...stdlib.hasRandom,
    getTicket: () => {
      const ticket = (Math.floor(Math.random() * numTickets) + 1);
      return ticket;
    },
    setParams: () => {
      console.log(`Started raffle with the parameters ${params}`)
      return params;
    },
    seeHash: (hash) => {
      console.log(`The winning number Hash is ${hash}`);
    },
    giveTickets: () => {
      for(const [i, ctc] of ctcBobs.entries()) {
        const ticket = (Math.floor(Math.random() * numTickets) + 1);
        const length = ticketsPicked.length();
        const addr = ctc.getContractAddress()
        try{
          while(ticketsPicked.length == length){
            if(!ticketsPicked.includes(ticket)){
              ctc.a.getTicket(ticket);
              ticketsPicked.push[ticket , addr];
              console.log(`Bob #${i} picked ticket number ${ticket}`);
            } else {
              console.log(`Sorry Bob #${i} that ticket is already picked\nPick another...`);
            }
          }
        } catch(e) {
          console.log(`All the tickets are picked for the Raffle.`);
        }
      }
    },
    checkWin: () => {
      for(const [i, ctc] of ctcBobs.entries()){
        try {
          const isWinner =  ctc.a.seeWinner();
          if(isWinner){
            console.log(`Bob #${i} has won the Raffle`);
          } else {
            console.log(`Better luck next time Bob #${i}`);
          }
        } catch(e) {
          console.log(e);
        }
      }
      console.log("Balances after Raffle:");
        printBalances(numTickets);
    },
    showOutcome: (Address) => {
      const index = ticketsPicked.indexOf(Address);
      console.log(`Bob #${index} won the Raffle with ticket ${ticketsPicked[Address]}`);
    }
  });
}

await runRaffle(20);