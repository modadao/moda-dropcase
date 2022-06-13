// SPDX-License-Identifier: MIT

// DropCase.sol --

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
pragma solidity >=0.6.12;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IChargedState.sol";
import "../interfaces/IChargedSettings.sol";
import "../interfaces/IChargedParticles.sol";
import "../interfaces/IChargedManagers.sol";

import "../interfaces/IDropCase.sol";
import "../lib/RelayRecipient.sol";
import "../lib/BlackholePrevention.sol";

contract DropCase is IDropCase, ERC721, Ownable, RelayRecipient, IERC721Receiver, BlackholePrevention {
  using Counters for Counters.Counter;
  uint256 public constant INITIAL_PRICE = 0 ether;

  IChargedState internal _chargedState;
  IChargedSettings internal _chargedSettings;
  IChargedParticles internal _chargedParticles;
  IChargedManagers internal _chargedManagers;

  uint256 internal _mintPrice;

  Counters.Counter internal _tokenCount;
  mapping (uint256 => address) internal _tokenCreator;


  /***********************************|
  |          Initialization           |
  |__________________________________*/
  constructor() public ERC721("Moda Dropcase NFT", "DropCase") {
    _mintPrice = INITIAL_PRICE;
    // address[] memory contracts = new address[](1);
    // contracts[0] = address(this);
    // _chargedSettings.enableNftContracts(contracts);
  }

  function onERC721Received(address, address, uint256, bytes calldata) external virtual override returns (bytes4) {
    return IERC721Receiver(0).onERC721Received.selector;
  }

  function creatorOf(uint256 tokenId) external view override returns (address) {
    return _tokenCreator[tokenId];
  }

  function mintNft(address receiver, string memory tokenUri) external payable override returns (uint256 newTokenId) {
    require(msg.value >= _mintPrice, "Not enough ETH sent: check price.");
    return _mintNft(msg.sender, receiver, tokenUri);
  }

  function _mintNft(address creator, address receiver, string memory tokenUri) internal returns (uint256 newTokenId) {
    _tokenCount.increment();
    newTokenId = _tokenCount.current();

    _safeMint(receiver, newTokenId, "");
    _tokenCreator[newTokenId] = creator;

    _setTokenURI(newTokenId, tokenUri);
    return newTokenId;
  }

  /***********************************|
  |          GSN/MetaTx Relay         |
  |__________________________________*/

  /// @dev See {BaseRelayRecipient-_msgSender}.
  function _msgSender()
    internal
    view
    virtual
    override(BaseRelayRecipient, Context)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  /// @dev See {BaseRelayRecipient-_msgData}.
  function _msgData()
    internal
    view
    virtual
    override(BaseRelayRecipient, Context)
    returns (bytes memory)
  {
    return BaseRelayRecipient._msgData();
  }


  /***********************************|
  |          Only Admin/DAO           |
  |__________________________________*/
  /**
  * @dev Setup the ChargedParticles Interface
  */
  function setChargedParticles(address chargedParticles) external virtual onlyOwner {
    _chargedParticles = IChargedParticles(chargedParticles);
    emit ChargedParticlesSet(chargedParticles);
  }

  /// @dev Setup the Charged-State Controller
  function setChargedState(address stateController) external virtual onlyOwner {
    _chargedState = IChargedState(stateController);
    emit ChargedStateSet(stateController);
  }

  /// @dev Setup the Charged-Settings Controller
  function setChargedSettings(address settings) external virtual onlyOwner {
    _chargedSettings = IChargedSettings(settings);
    emit ChargedSettingsSet(settings);
  }

  /// @dev Setup the Charged-Managers Controller
  function setChargedManagerss(address managers) external virtual onlyOwner {
    _chargedManagers = IChargedManagers(managers);
    emit ChargedManagersSet(managers);
  }

  function setMintPrice(uint256 price) external onlyOwner {
    _mintPrice = price;
    emit NewMintPrice(price);
  }
  /***********************************|
  |          Only Admin/DAO           |
  |      (blackhole prevention)       |
  |__________________________________*/

  function withdrawEther(address payable receiver, uint256 amount)
      external
      onlyOwner
  {
      _withdrawEther(receiver, amount);
  }

  function withdrawERC20(
      address payable receiver,
      address tokenAddress,
      uint256 amount
  ) external onlyOwner {
      _withdrawERC20(receiver, tokenAddress, amount);
  }

  function withdrawERC721(
      address payable receiver,
      address tokenAddress,
      uint256 tokenId
  ) external onlyOwner {
      _withdrawERC721(receiver, tokenAddress, tokenId);
  }
}