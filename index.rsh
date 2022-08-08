'reach 0.1';

const amt = 1;
const duration = 200;

const [ isOutcome, BLOSE, BWIN ] = makeEnum(2);
const outcome = (BTicket, WTicket) => ((BTicket == WTicket) ? 1 : 0)

forall(UInt, BTicket =>
  forall(UInt, WTicket => 
    assert(isOutcome(outcome(BTicket,WTicket)))));

export const main = Reach.App(() => {
  setOptions({ untrustworthyMaps: true });
  const A = Participant('Alice', {
    // Specify Alice's interact interface here
    ...hasRandom,
    getTicket: Fun([UInt], UInt),
    setParams: Fun([],Object({
      NFT: Token,
      ticketAmount: UInt,
    })),
    seeHash: Fun([Digest], Null),
    giveTickets: Fun([], Null),
    checkWin: Fun([], Null),
    showOutcome: Fun([Address], Null),
  });
  const B = API('Bob', {
    // Specify Bob's interact interface here
    getTicket: Fun([UInt], Null),
    seeWinner: Fun([], Bool),
  });
  init();

  A.only(() => {
    const { NFT, ticketAmount } = declassify(interact.setParams());
    const _winningTicket = interact.getTicket(ticketAmount);
    const [_commitA, _saltA] = makeCommitment(interact, _winningTicket);
    const commitA = declassify(_commitA)
  });

  A.publish(NFT, ticketAmount, commitA);
  A.interact.seeHash(commitA);
  commit();
  A.pay([[amt, NFT]]);
  A.interact.giveTickets();

  const pickedTickets = new Map(Address,UInt);

  const [ticketsPicked,isPicking] =
    parallelReduce([ 0, true ])
    .invariant(balance(NFT) == amt && balance() == 0)
    .invariant(ticketsPicked <= ticketAmount)
    .while(ticketsPicked < ticketAmount && isPicking)
    .api_(B.getTicket, (ticket) => {
      return [ 0, (k) => {
        k(null);
        pickedTickets[this] = ticket;
        return [ticketsPicked + 1, true]
      }]
    })
    .timeout(relativeTime(duration), () => {
      A.publish();
      return [ ticketsPicked, false ];
    });

  commit();
  A.only(() => {
    const saltA = declassify(_saltA);
    const winningTicket = declassify(_winningTicket);
  });
  A.publish(saltA, winningTicket);
  checkCommitment(commitA, saltA, winningTicket);
  A.interact.checkWin();


  const [winner, remainingB ] = 
    parallelReduce([ A, ticketsPicked ])
    .invariant(balance(NFT) == amt && balance() == 0)
    .invariant(remainingB <= ticketsPicked)
    .while(remainingB > 0)
    .api(B.seeWinner, 
      (k) => {
        const BTicket = fromSome(pickedTickets[this],0);
        assert(outcome(BTicket,winningTicket) == BWIN ||
              outcome(BTicket,winningTicket) == BLOSE);

        if(outcome(BTicket,winningTicket) == BWIN){

          k(true);
          delete pickedTickets[this];
          return [this, remainingB -1];

        } else {

          k(false);
          delete pickedTickets[this];
          return [ A , remainingB -1 ];

        }
      })

  transfer(amt,NFT).to(winner);
  A.interact.showOutcome(winner);
  commit();
  exit();
});
