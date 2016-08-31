import "ERC20.sol";

library BidLib {

  struct Bid {
      bytes32 id;
      address buyer;
      address token;
      uint quantity;
      uint price;
      uint dateIssued;
      uint dateUpdated;
      bool open;
  }

  struct Data {
    mapping(bytes32 => Bid) bids;
    uint updatedValue;
    uint remainderValue;
    uint totalSupply;
  }

  event BidLog(address indexed _token, bytes32 indexed _id, uint _quantity, uint _price, uint _date, bool _active);


  function newBid(Data storage self, address _token, uint _quantity, uint _price)
    validateBid(self, _token, _quantity, _price) returns (bool){

      Bid memory b;
      b.buyer = msg.sender;
      b.token = _token;
      b.quantity = _quantity;
      b.price = _price;
      b.dateIssued = now;
      b.open = true;
      b.id = sha3(b.buyer, b.quantity, b.price, b.dateIssued);
      self.bids[b.id] = b;

      // Log the event
      BidLog(b.token, b.id, b.quantity, b.price, b.dateIssued, true);
      return true;
  }


  function updateBid(Data storage self, bytes32 _bidID, uint  _price, uint _quantity)
    validateBid(self, self.bids[_bidID].token, _quantity, _price) returns (bool) {

      Bid memory b = self.bids[_bidID];
      self.updatedValue = _price*_quantity;
      self.remainderValue = self.updatedValue - b.price*b.quantity;

      if(b.buyer != msg.sender){
        throw;
      } else if(self.updatedValue == 0){
        throw;
      } else if(self.updatedValue == b.price*b.quantity){
        throw;
      } else if(self.remainderValue < 0 && !b.buyer.send(0 - self.remainderValue)){
        throw;
      } else if(self.remainderValue > 0 && msg.value < self.remainderValue){
        throw;
      } else if(msg.value > self.remainderValue && !b.buyer.send(msg.value - self.remainderValue)){
        throw;
      }

      b.price = _price;
      b.quantity = _quantity;
      b.dateUpdated = now;
      self.bids[_bidID] = b;
      BidLog(b.token, b.id, b.quantity, b.price, b.dateUpdated, true);

      return true;
  }


  function deleteBid(Data storage self, bytes32 _bidID) returns (bool) {

    Bid memory b = self.bids[_bidID];
    if(b.buyer != msg.sender){
      // Make sure the bidder is the person calling this function
      throw;
    } else if (!b.buyer.send(b.price*b.quantity)) {
      throw;
    }

    delete self.bids[_bidID];
    BidLog(b.token, b.id, b.quantity, b.price, now, false);
    return true;
  }


  function getBid(Data storage self, bytes32 _bidID) internal returns (Bid) {
    return self.bids[_bidID];
  }


  modifier validateBid(Data storage self, address _token, uint _quantity, uint _price){
      ERC20 Token = ERC20(_token);
      self.totalSupply = Token.totalSupply();
      if(self.totalSupply == 0){
          throw;
      } else if(_quantity > self.totalSupply){
          throw;
      } else if(_quantity <= 0){
          throw;
      } else if(_price <= 0){
          throw;
      } else if(msg.sender.balance < (_quantity*_price)){
          throw;
      } else if(msg.value != (_quantity*_price)){
          throw;
      } _
  }

}
