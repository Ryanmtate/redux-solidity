import "CaseLibrary.sol";

contract Case {

    using CaseLibrary for CaseLibrary.Data;
    CaseLibrary.Data internal caseData;

    address public OriginatingParty;
    uint public dateIssued;

    function Case(address _originatingParty, address[] _opposingParties){
        OriginatingParty = _originatingParty;
        dateIssued = now;

        caseData.originatingParties.primaryContract = _originatingParty;
        caseData.originatingParties.members.push(_originatingParty);
        caseData.originatingParties.isMember[_originatingParty] = true;

        caseData.opposingParties.primaryContract = _opposingParties[0];
        caseData.opposingParties.members = _opposingParties;
        for(var i = 0; i < _opposingParties.length; i++){
            caseData.opposingParties.isMember[_opposingParties[i]] = true;
        }
    }

    function addClaim(string _description, uint _desiredSettlementValue) public returns(bool){
        if(!caseData.newClaim(_description, _desiredSettlementValue)){
            return false;
        } else {
            return true;
        }
    }

    function getClaim(bytes32 _id) constant returns(string _description, uint _desiredSettlementValue,
        bytes32 _status, uint _dateIssued, uint _dateAmended, uint _dateDecided, uint _amountPaid){
        CaseLibrary.Claim memory c = caseData.claims[_id];
        return (c.description, c.desiredSettlementValue, c.status, c.dateIssued, c.dateAmended, c.dateDecided, c.amountPaid);
    }

    function claimResponse(bytes32 _id) isOpposingParty() isNegotiable(_id) public returns(bool){
        if(!caseData.respondToClaim(_id, msg.value)){
            return false;
        } else {
            return true;
        }
    }

    function getClaims() constant returns(bytes32[]){
        return caseData.claimIDs;
    }

    function negotiateClaim(bytes32 _id, bool _decision) isOriginatingParty() isNegotiable(_id) public returns(bool){
        // Do we agree with the claim response from the opposing party?
        // if yes => close claim, update status;
        // if no => reject claimResponse and update claim if desired settlement value decreases;
        CaseLibrary.ClaimResponse memory CR = caseData.responses[_id][caseData.responses[_id].length - 1];
        CaseLibrary.Claim memory c = caseData.claims[_id];
        if(_decision){
            uint platformFee = CR.amountPaid*25/1000; //.25% platform fee; Place in a config Arbiter contract for later;
            if(!caseData.originatingParties.primaryContract.send(CR.amountPaid - platformFee)){
                throw;
            } else {


                // Update the Claim
                c.status = "resolved";
                c.dateDecided = now;
                c.amountPaid = CR.amountPaid;
                caseData.claims[_id] = c;

                // Update The Claim Response;
                CR.dateReceived = now;
                CR.accepted = true;
                caseData.responses[_id][caseData.responses[_id].length - 1] = CR;


                return true;
            }
        } else {
            CR.dateReceived = now;
            caseData.responses[_id][caseData.responses[_id].length - 1] = CR;
            return true;
        }

    }

    function getClaimResponse(bytes32 id) constant returns(bytes32 _claimID,
    uint _amountPaid, uint _counterSettlementValue, uint _dateResponded, bool _accepted){

        CaseLibrary.ClaimResponse memory CR;
        CR = caseData.responses[id][caseData.responses[id].length - 1];

        return (
            CR.claimID,
            CR.amountPaid,
            CR.counterSettlementValue,
            CR.dateResponded,
            CR.accepted
            );
    }

    modifier isOriginatingParty(){
        if(!caseData.originatingParties.isMember[msg.sender]){
            throw;
        } _
    }

    modifier isOpposingParty(){
        if(!caseData.opposingParties.isMember[msg.sender]){
            throw;
        } _
    }

    modifier isNegotiable(bytes32 id){
        if(caseData.claims[id].status == "verifying" || caseData.claims[id].status == "resolved" ){
            throw;
        } _
    }

}
