import "Case.sol";

contract Cases {

    function Cases(){}

    event NewCase(address indexed _originatingParty, address indexed _opposingParty, address indexed _case);

    address[] public cases;

    function newCase(address[] _opposingParties) public returns(bool){
        Case c = new Case(msg.sender, _opposingParties);
        cases.push(c);
        NewCase(msg.sender, _opposingParties[0], c);
        return true;
    }

    function getCases() constant returns(address[]){
        return cases;
    }
}
