library CaseLibrary {

    struct Opinion {
        address[] arbitrators;
        string opinion;
    }

    struct ClaimResponse {
        bytes32 claimID;
        uint amountPaid;
        uint counterSettlementValue;
        uint dateResponded;
        uint dateReceived;
        bool accepted;
    }

    struct Party {
        address primaryContract;
        address[] members;
        mapping(address => bool) isMember;
    }

    struct Document {
        string title;
        string ipfsHash;
        uint dateAdded;
        uint docID;
    }

    struct Claim {
        string description;
        uint desiredSettlementValue;
        bytes32 status;
        uint dateIssued;
        uint dateAmended;
        uint dateDecided;
        uint amountPaid;
    }

    struct Data {
        Document[] documents;
        Party originatingParties;
        Party opposingParties;
        mapping(bytes32 => Claim) claims;
        bytes32[] claimIDs;
        mapping(bytes32 => ClaimResponse[]) responses;
    }

    event NewClaim(bytes32 _claimID);

    function newClaim(Data storage self, string _description, uint _desiredSettlementValue) internal returns(bool){
        Claim memory c;
        c.description = _description;
        c.desiredSettlementValue = _desiredSettlementValue;
        c.dateIssued = now;
        c.amountPaid = 0;
        c.status = bytes32('pending');
        bytes32 id = sha3(c.description, c.dateIssued);

        self.claimIDs.push(id);
        self.claims[id] = c;
        NewClaim(id);
        return true;
    }

    function respondToClaim(Data storage self, bytes32 id, uint _counterSettlementValue) internal returns(bool){
        if(_counterSettlementValue >= self.claims[id].desiredSettlementValue*(1 ether)){

            uint platformFee = msg.value*25/1000; //.25% platform fee; Place in a config Arbiter contract for later;
            // uint excess = 0;

            // if(msg.value >= self.claims[id].desiredSettlementValue*(1 ether) + platformFee){
            //     excess = msg.value-(self.claims[id].desiredSettlementValue*(1 ether) + platformFee);
            //     if(!msg.sender.send(excess)){
            //         throw;
            //     }
            // }

            if(!self.originatingParties.primaryContract.send(_counterSettlementValue - platformFee)){
                throw;
            } else {
                return true;
            }
        } else {

            ClaimResponse memory cR;
            cR.counterSettlementValue = _counterSettlementValue;
            cR.claimID = id;
            cR.amountPaid = msg.value;
            cR.dateResponded = now;
            cR.accepted = false;
            self.responses[id].push(cR);

            return true;
        }
    }
}
