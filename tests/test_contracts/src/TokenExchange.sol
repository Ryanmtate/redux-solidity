import "ERC20.sol";
import "AskLib.sol";
import "BidLib.sol";

contract TokenExchange {

    // Library data/vars
    using AskLib for AskLib.Data;
    using BidLib for BidLib.Data;
    AskLib.Data internal _asks;
    BidLib.Data internal _bids;

    /*event SettledTrade(address indexed _token, bytes32 indexed _id, uint _quantity, uint _price, uint _date);*/

    // Contract admin vars
    mapping(address => bool) internal admin;
    bool public live;


    // Default (deploy) function
    //--------------------------
    function TokenExchange(){
      admin[msg.sender] = true;
      live = true;
    }


    // ASK orders
    //-----------
    function newAsk(address _token, uint _quantity, uint _price)
      ExchangeIsLive() public returns(bool){
        if (!_asks.newAsk(_token, _quantity, convertPrice(_price))){ throw; }
        else { return true; }
    }

    function updateAsk(bytes32 _askID, uint _price, uint _quantity)
      ExchangeIsLive() public returns(bool){
        if (!_asks.updateAsk(_askID, convertPrice(_price), _quantity)) { throw; }
        else { return true; }
    }

    function deleteAsk(bytes32 _askID) public returns(bool){
      if (!_asks.deleteAsk(_askID)) { throw; }
      else { return true; }
    }

    function getAsk(bytes32 _askID) constant returns(bytes32 _id, address _seller,
      address _token, uint _quantity, uint _price, uint _dateIssued, bool _open){
        AskLib.ask memory a = _asks.getAsk(_askID);
        return (a.id, a.seller, a.token, a.quantity, a.price, a.dateIssued, a.open);
    }


    // BID orders
    //-----------
    function newBid(address _token, uint _quantity, uint _price)
      ExchangeIsLive() public returns(bool){
        if (!_bids.newBid(_token, _quantity, convertPrice(_price) )) { throw; }
        else { return true; }
    }

    function updateBid(bytes32 _bidID, uint _price, uint _quantity)
      ExchangeIsLive() public returns(bool){
        if (!_bids.updateBid(_bidID, convertPrice(_price), _quantity)) { throw; }
        else { return true; }
    }

    function deleteBid(bytes32 _bidID) public returns(bool){
      if (!_bids.deleteBid(_bidID)) { throw; }
      else { return true; }
    }

    function getBid(bytes32 _bidID) constant returns(bytes32 _id, address _buyer,
      address _token, uint _quantity, uint _price, uint _dateIssued, bool _open){
        BidLib.Bid memory b = _bids.getBid(_bidID);
        return (b.id, b.buyer, b.token, b.quantity, b.price, b.dateIssued, b.open);
    }

    /*function settleAsk(address _token, bytes32 _bidID, uint _quantity, uint _price)
        ExchangeIsLive()
        validateAsk(_token, _quantity, convertPrice(_price), 0x0)
        validateSettleAsk(_bidID, _token, _price, _quantity)
        public returns(bool){

          if(bids[_bidID].quantity > matchQuantity(bids[_bidID].quantity, _quantity)){
            bids[_bidID].quantity -= matchQuantity(bids[_bidID].quantity, _quantity);
            BidLog(bids[_bidID].token, _bidID, bids[_bidID].quantity, bids[_bidID].price, now, true);
          } else if(bids[_bidID].quantity <= matchQuantity(bids[_bidID].quantity, _quantity)){
            delete bids[_bidID];
            BidLog(bids[_bidID].token, _bidID, bids[_bidID].quantity, bids[_bidID].price, now, false);
          }

          SettledTrade(
            bids[_bidID].token,
            sha3(msg.sender, bids[_bidID].buyer, now),
            matchQuantity(bids[_bidID].quantity, _quantity),
            convertPrice(_price),
            now
          );

          return true;
    }*/

    /*function settleBid(address _token, bytes32 _askID, uint _quantity, uint _price)
        ExchangeIsLive()
        validateBid(_token, _quantity, convertPrice(_price)) public returns(bool){
            ERC20 Token = ERC20(_token);
            Ask memory a = asks[_askID];
            uint settleQuantity = matchQuantity(a.quantity, _quantity);
            uint settlementValue = settleQuantity*a.price;
            uint remainderValue = msg.value - settlementValue;

            if(!a.open){
                throw;
            } else if(_token != a.token){
                throw;
            } else if(a.price > convertPrice(_price)){
                throw;
            } else if(msg.value < settlementValue){
                throw;
            } else if(!msg.sender.send(remainderValue)){
                throw;
            } else if(!Token.transferFrom(a.seller, msg.sender, settleQuantity)){
                throw;
            } else if(!a.seller.send(settlementValue)){
                throw;
            } else if(a.quantity > settleQuantity){
                asks[_askID].quantity -= settleQuantity;
                AskLog(a.token, a.id, asks[_askID].quantity, a.price, now, true);
            } else if(a.quantity <= settleQuantity){
                delete asks[_askID];
                AskLog(a.token, a.id, a.quantity, a.price, now, false);
            }

            uint settlementDate = now;
            bytes32 settlementId = sha3(a.seller, msg.sender, settlementDate);
            SettledTrade(a.token, settlementId, settleQuantity, convertPrice(_price), settlementDate);
            return true;
    }*/


    /*modifier validateSettleAsk(bytes32 _bidID, address _token, uint _price, uint _quantity) {
      ERC20 Token = ERC20(_token);
      uint settleQuantity = matchQuantity(bids[_bidID].quantity, _quantity);
      uint settlementValue = bids[_bidID].price*settleQuantity;

      if(!bids[_bidID].open){
          throw;
      } else if(_token != bids[_bidID].token){
          throw;
      } else if(bids[_bidID].price < convertPrice(_price)){
          throw;
      } else if(!Token.transferFrom(msg.sender, bids[_bidID].buyer, settleQuantity)){
          throw;
      } else if(!msg.sender.send(settlementValue)) {
          throw;
      } _
    }*/


    // Exchange modifiers
    //-------------------
    modifier ExchangeIsLive(){
      if (!live) { throw; } _
    }

    modifier IsAdmin(){
      if(!admin[msg.sender]){ throw; } _
    }


    // Admin Utils
    //------------
    function setExchangeStatus(bool _live) IsAdmin() public returns(bool){
        live = _live;
        return true;
    }

    function addAdmin(address _admin) IsAdmin() public returns(bool){
      admin[_admin] = true;
      return true;
    }


    // Utility functions
    //------------------
    function convertPrice(uint _price) internal returns(uint){
        return _price*1 szabo;
    }

    function matchQuantity(uint supply, uint demand) internal returns(uint){
        if(supply >= demand){
            return demand;
        } else {
            return supply;
        }
    }

    // Fallback (don't allow users to send money here)
    //------------------------------------------------
    function() { throw; }

}
