import "ERC20.sol";

library AskLib {

  struct ask {
    bytes32 id;
    address seller;
    address token;
    uint quantity;
    uint price;
    uint dateIssued;
    uint dateUpdated;
    bool open;
  }

  struct Data {
    mapping(bytes32 => ask) asks;
    // User --> (Token --> ask order sum)
    mapping(address => mapping(address => uint)) askSums;
    uint totalSupply;
    uint sellerBalance;
    uint totalAsks;
  }

  event AskLog(address indexed _token, bytes32 indexed _id,
    uint _quantity, uint _price, uint _date, bool _active);


  function newAsk(Data storage self, address _token, uint _quantity, uint _price)
    validateAsk(self, _token, _quantity, _price, 0x0)
    returns (bool){
      ask memory a;
      a.seller = msg.sender;
      a.token = _token;
      a.quantity = _quantity;
      a.price = _price;
      a.dateIssued = now;
      a.open = true;
      a.id = sha3(a.seller, a.quantity, a.price, a.dateIssued);

      self.asks[a.id] = a;

      // Update the sum of ask quantity (we have already validated the
      // quantity can be added to the sum)
      self.askSums[a.seller][a.token] += _quantity;

      AskLog(a.token, a.id, a.quantity, a.price, a.dateIssued, true);
      return true;
  }


  function updateAsk(Data storage self, bytes32 _askID, uint _price, uint _quantity)
    validateAsk(self, self.asks[_askID].token, _quantity, _price, _askID)
    returns (bool) {

      ask memory a = self.asks[_askID];
      if(a.seller != msg.sender){
        throw;
      } else {
        // Update the sum of ask quantity (we have already validated the
        // quantity can be added to the sum)
        self.askSums[a.seller][a.token] += (_quantity - self.asks[_askID].quantity);

        a.price = _price;
        a.quantity = _quantity;
        a.dateUpdated = now;
        self.asks[_askID] = a;
        AskLog(a.token, a.id, a.quantity, a.price, a.dateUpdated, true);

        return true;
      }
  }


  function deleteAsk(Data storage self, bytes32 _askID) returns (bool) {
    ask memory a = self.asks[_askID];
    if(a.seller != msg.sender){
      throw;
    } else {
      // Deduct from the sum of ask orders for this user for this token
      self.askSums[a.seller][a.token] -= a.quantity;
      // Delete the order and log the event
      delete self.asks[_askID];
      AskLog(a.token, a.id, a.quantity, a.price, now, false);
      return true;
    }
  }


  function getAsk(Data storage self, bytes32 _askID) internal returns (ask) {
    return self.asks[_askID];
  }



  modifier validateAsk(Data storage self, address _token,
    uint _quantity, uint _price, bytes32 _askID){

      ERC20 Token = ERC20(_token);
      self.totalSupply = Token.totalSupply();
      self.sellerBalance = Token.balanceOf(msg.sender);

      // The running total of ask orders for this user for this token
      self.totalAsks = self.askSums[msg.sender][_token] + _quantity;
      // If this is an updated ask order, deduct the original quantity
      if (_askID != 0x0) { self.totalAsks -= self.asks[_askID].quantity; }


      if(self.totalSupply == 0){
        throw;
      } else if(_quantity > self.totalSupply){
        throw;
      } else if(_quantity <= 0){
        throw;
      } else if(self.sellerBalance < self.totalAsks){
        throw;
      } else if(Token.allowance(msg.sender, address(this)) < self.totalAsks){
        throw;
      } else if(_price <= 0){
        throw;
      } _
  }


}
