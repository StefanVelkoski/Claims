import { StaticJsonRpcProvider, Web3Provider } from "@ethersproject/providers";
import { formatEther, parseEther } from "@ethersproject/units";
import { BigNumber } from "@ethersproject/bignumber";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { Alert, Button, Card, Col, Input, List, Menu, Row } from "antd";
import "antd/dist/antd.css";
import { useUserAddress } from "eth-hooks";
import React, { useCallback, useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { BrowserRouter, Link, Route, Switch } from "react-router-dom";
import Web3Modal from "web3modal";
import "./App.css";
import {
  Account,
  Address,
  AddressInput,
  Claims,
  Contract,
  Faucet,
  Homepage,
  GasGauge,
  Header,
  Footer,
  Ramp,
  ThemeSwitch,
  Sell,
  Mint,
  LazyMint,
  RaribleItemIndexer,
} from "./components";
import { DAI_ABI, DAI_ADDRESS, INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useEventListener,
  useExchangePrice,
  useExternalContractLoader,
  useGasPrice,
  useOnBlock,
  useUserProvider,
} from "./hooks";
import { matchSellOrder, prepareMatchingOrder } from "./rarible/createOrders";
import { RARIBLE_BASE_URL } from "./constants";

const { BufferList } = require("bl");
// https://www.npmjs.com/package/ipfs-http-client
const ipfsAPI = require("ipfs-http-client");

const ipfs = ipfsAPI({ host: "ipfs.infura.io", port: "5001", protocol: "https" });
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/austintgriffith/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const targetNetwork = NETWORKS.ropsten; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = true;

// EXAMPLE STARTING JSON:
const STARTING_JSON = {
  description: "It's actually a bison?",
  external_url: "https://austingriffith.com/portfolio/paintings/", // <-- this can link to a page for the specific file too
  image: "https://austingriffith.com/images/paintings/buffalo.jpg",
  name: "Buffalo",
  attributes: [
    {
      trait_type: "BackgroundColor",
      value: "green",
    },
    {
      trait_type: "Eyes",
      value: "googly",
    },
  ],
};

// helper function to "Get" from IPFS
// you usually go content.toString() after this...
const getFromIPFS = async hashToGet => {
  for await (const file of ipfs.get(hashToGet)) {
    // console.log(file.path);
    if (!file.content) continue;
    const content = new BufferList();
    for await (const chunk of file.content) {
      content.append(chunk);
    }
    // console.log(content);
    return content;
  }
};

// 🛰 providers
// if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");
// const mainnetProvider = getDefaultProvider("mainnet", { infura: INFURA_ID, etherscan: ETHERSCAN_KEY, quorum: 1 });
// const mainnetProvider = new InfuraProvider("mainnet",INFURA_ID);
//
// attempt to connect to our own scaffold eth rpc and if that fails fall back to infura...
// Using StaticJsonRpcProvider as the chainId won't change see https://github.com/ethers-io/ethers.js/issues/901
const scaffoldEthProvider = new StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544");
const mainnetInfura = new StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID);
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  // network: "mainnet", // optional
  cacheProvider: true, // optional
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

function App(props) {
  const mainnetProvider = scaffoldEthProvider && scaffoldEthProvider._network ? scaffoldEthProvider : mainnetInfura;

  const [injectedProvider, setInjectedProvider] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProvider = useUserProvider(injectedProvider, localProvider);
  var address = useUserAddress(userProvider);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId = userProvider && userProvider._network && userProvider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userProvider, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  // const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  // const yourMainnetBalance = useBalance(mainnetProvider, address);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);

  // If you want to make 🔐 write transactions to your contracts, use the userProvider:
  const writeContracts = useContractLoader(userProvider);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetDAIContract = useExternalContractLoader(mainnetProvider, DAI_ADDRESS, DAI_ABI);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    // console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader({ DAI: mainnetDAIContract }, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const balance = useContractReader(readContracts, "YourCollectible", "balanceOf", [address]);
  // console.log("🤗 balance:", balance);
  // 📟 Listen for broadcast events
  const transferEvents = useEventListener(readContracts, "YourCollectible", "Transfer", localProvider, 1);
  // console.log("📟 Transfer events:", transferEvents);

  //
  // 🧠 This effect will update yourCollectibles by polling when your balance changes
  //
  // const yourBalance = balance && balance.toNumber && balance.toNumber();
  const [yourCollectibles, setYourCollectibles] = useState();

 

  let networkDisplay = "";
  if (localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div style={{ zIndex: 2, position: "absolute", right: 0, top: 60, padding: 16 }}>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <b>{networkLocal && networkLocal.name}</b>.
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = (
      <div style={{ zIndex: -1, position: "absolute", right: 154, top: 28, padding: 16, color: targetNetwork.color }}>
        {targetNetwork.name}
      </div>
    );
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new Web3Provider(provider));
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);

    console.log("appcontract",writeContracts)
  }, [setRoute]);


  
 

  const [yourJSON, setYourJSON] = useState(STARTING_JSON);
  const [sending, setSending] = useState();
  const [ipfsHash, setIpfsHash] = useState();
  const [ipfsDownHash, setIpfsDownHash] = useState();
  const [collectionContract, setCollectionContract] = useState();
  const [tokenId, setTokenId] = useState();

  const [downloading, setDownloading] = useState();
  const [ipfsContent, setIpfsContent] = useState();

  const [sellOrderContent, setSellOrderContent] = useState();

  const [transferToAddresses, setTransferToAddresses] = useState({});
  const [approveAddresses, setApproveAddresses] = useState({});

  const appBody = {
    paddingTop:"6%",
    minHeight: "100vh",
  }
  
  return (
    <div className="App" style={appBody}>
      {networkDisplay}
      <BrowserRouter>
        <Header />
          <Route path="/" exact>
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
                        <LazyMint
                          ensProvider={mainnetProvider}
                          provider={userProvider}
                          writeContracts={writeContracts}
                          accountAddress={address}
                        ></LazyMint>
                </div>
              </Route> 
          <Route path= "/menu" exact>
          <Menu style={{ textAlign: "center" }} selectedKeys={[route]} mode="horizontal">
          <Menu.Item key="/mint">
            <Link
              onClick={() => {
                setRoute("/mint");
              }}
              to="/mint"
            >
              Mint
            </Link>
          </Menu.Item>
          <Menu.Item key="/raribleItemIndexer">
            <Link
              onClick={() => {
                setRoute("/raribleItemIndexer");
              }}
              to="/raribleItemIndexer"
            >
              Rarible Item Indexer
            </Link>
          </Menu.Item>
          <Menu.Item key="/rarible">
            <Link
              onClick={() => {
                setRoute("/rarible");
              }}
              to="/rarible"
            >
              Rarible Order Indexer
            </Link>
          </Menu.Item>
          <Menu.Item key="/transfers">
            <Link
              onClick={() => {
                setRoute("/transfers");
              }}
              to="/transfers"
            >
              Transfers
            </Link>
          </Menu.Item>
          <Menu.Item key="/ipfsup">
            <Link
              onClick={() => {
                setRoute("/ipfsup");
              }}
              to="/ipfsup"
            >
              IPFS Upload
            </Link>
          </Menu.Item>

        </Menu>
          </Route>   
      

        <Switch>

          <Route path="/mint">
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
                        <Mint
                      ensProvider={mainnetProvider}
                          provider={userProvider}
                          writeContracts={writeContracts}
                        ></Mint>
            </div>

          </Route>

          <Route path="/lazyMint">
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
                        <LazyMint
                          ensProvider={mainnetProvider}
                          provider={userProvider}
                          writeContracts={writeContracts}
                          accountAddress={address}
                        ></LazyMint>
            </div>
          </Route>

          <Route path="/claims" exact>
            <div style={{  width: "1300px", margin: "auto" }}>
                      <Claims
                          ensProvider={mainnetProvider}
                          provider={userProvider}
                          writeContracts={writeContracts}
                          accountAddress={address}
                ></Claims>
            </div>

          </Route>

          <Route path="/raribleItemIndexer">
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
                        <RaribleItemIndexer
                          ensProvider={mainnetProvider}
                          tx={tx}
                          provider={userProvider}
                          writeContracts={writeContracts}
                          accountAddress={address}
                        ></RaribleItemIndexer>
            </div>

          </Route>

          <Route path="/rarible">
            <div style={{ paddingTop: 32, width: 740, margin: "auto" }}>
              <AddressInput
                ensProvider={mainnetProvider}
                placeholder="NFT collection address"
                value={collectionContract}
                onChange={newValue => {
                  setCollectionContract(newValue);
                }}
              />
              <Input
                value={tokenId}
                placeholder="tokenId"
                onChange={e => {
                  setTokenId(e.target.value);
                }}
              />
            </div>
            <Button
              style={{ margin: 8 }}
              loading={sending}
              size="large"
              shape="round"
              type="primary"
              onClick={async () => {
                setDownloading(true);
                let sellOrderResult
                if (tokenId) {
                const getSellOrdersByItemUrl = `${RARIBLE_BASE_URL}order/orders/sell/byItem?contract=${collectionContract}&tokenId=${tokenId}&sort=LAST_UPDATE`
                sellOrderResult = await fetch(getSellOrdersByItemUrl);
                } else {
                const getSellOrderByCollectionUrl = `${RARIBLE_BASE_URL}order/orders/sell/byCollection?collection=${collectionContract}&sort=LAST_UPDATE`;
                sellOrderResult = await fetch(getSellOrderByCollectionUrl);
                }
                const resultJson = await sellOrderResult.json();
                if (resultJson && resultJson.orders) {
                  setSellOrderContent(resultJson.orders);
                }
                setDownloading(false);
              }}
            >
              Get Sell Orders
            </Button>

            <pre style={{ padding: 16, width: 500, margin: "auto", paddingBottom: 150 }}>
              {JSON.stringify(sellOrderContent)}
            </pre>
            <div style={{ width: 640, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <List
                bordered
                dataSource={sellOrderContent}
                renderItem={item => {
                  const id = item.hash;
                  return (
                    <List.Item key={id}>
                      <Card
                        title={
                          <div>
                            <span style={{ fontSize: 16, marginRight: 8 }}>{item.type}</span>
                          </div>
                        }
                      >
                        <div>
                          <p>maker: {item.maker}</p>
                          <p>selling:</p>
                          <p>collection: {item.make.assetType.contract}</p>
                          <p>tokenId: {item.make.assetType.tokenId}</p>
                          <p>
                            price: {formatEther(item.take.value)}
                            {item.take.assetType.assetClass}
                          </p>
                          <p>createAt: {item.createdAt}</p>
                        </div>
                      </Card>

                      <Button
                        onClick={async () =>{
                          const preparedTransaction = await prepareMatchingOrder(item, address)
                          // console.log({preparedTransaction})
                          const value = preparedTransaction.asset.value
                          const valueBN = BigNumber.from(value)
                          const safeValue = valueBN.add(100)
                          // console.log({safeValue})
                          const signer = userProvider.getSigner()
                          tx(signer.sendTransaction({to: preparedTransaction.transaction.to, from: address, data: preparedTransaction.transaction.data, value: safeValue}))

                        }
                        }
                      >
                        Fill order
                      </Button>
                    </List.Item>
                  );
                }}
              />
            </div>
          </Route>

          <Route path="/transfers">
            <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 32 }}>
              <List
                bordered
                dataSource={transferEvents}
                renderItem={item => {
                  return (
                    <List.Item key={item[0] + "_" + item[1] + "_" + item.blockNumber + "_" + item[2].toNumber()}>
                      <span style={{ fontSize: 16, marginRight: 8 }}>#{item[2].toNumber()}</span>
                      <Address address={item[0]} ensProvider={mainnetProvider} fontSize={16} /> =&gt;
                      <Address address={item[1]} ensProvider={mainnetProvider} fontSize={16} />
                    </List.Item>
                  );
                }}
              />
            </div>
          </Route>

          <Route path="/ipfsup">
            <div style={{ paddingTop: 32, width: 740, margin: "auto", textAlign: "left" }}>
              <ReactJson
                style={{ padding: 8 }}
                src={yourJSON}
                theme="pop"
                enableClipboard={false}
                onEdit={(edit, a) => {
                  setYourJSON(edit.updated_src);
                }}
                onAdd={(add, a) => {
                  setYourJSON(add.updated_src);
                }}
                onDelete={(del, a) => {
                  setYourJSON(del.updated_src);
                }}
              />
            </div>

            <Button
              style={{ margin: 8 }}
              loading={sending}
              size="large"
              shape="round"
              type="primary"
              onClick={async () => {
                // console.log("UPLOADING...", yourJSON);
                setSending(true);
                setIpfsHash();
                const result = await ipfs.add(JSON.stringify(yourJSON)); // addToIPFS(JSON.stringify(yourJSON))
                if (result && result.path) {
                  setIpfsHash(result.path);
                }
                setSending(false);
                // console.log("RESULT:", result);
              }}
            >
              Upload to IPFS
            </Button>

            <div style={{ padding: 16, paddingBottom: 150 }}>{ipfsHash}</div>
          </Route>


        </Switch>
        
        
        
        <Footer />

      </BrowserRouter>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <Account
          address={address}
          localProvider={localProvider}
          userProvider={userProvider}
          mainnetProvider={mainnetProvider}
          price={price}
          web3Modal={web3Modal}
          loadWeb3Modal={loadWeb3Modal}
          logoutOfWeb3Modal={logoutOfWeb3Modal}
          blockExplorer={blockExplorer}
        />
      </div>

    </div>
  );
}

/* eslint-disable */
window.ethereum &&
  window.ethereum.on("chainChanged", chainId => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });

window.ethereum &&
  window.ethereum.on("accountsChanged", accounts => {
    web3Modal.cachedProvider &&
      setTimeout(() => {
        window.location.reload();
      }, 1);
  });
/* eslint-enable */

export default App;
