import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css'
import { Slide, Zoom, Flip, Bounce } from 'react-toastify';
import "./App.css";
import "./toastOverride.css"
import abi from "./utils/WavePortal.json";

import metaMaskIcon from "./img/metaMask.png";
import twitterIcon from "./img/twitter.svg";
import openSeaIcon from "./img/openSea.svg";
import cyberConnectIcon from "./img/cyberConnect.svg";
import mirrorIcon from "./img/mirror.svg";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");

  const [currentTotalWaveCount, setCurrentTotalWaveCount] = useState("-1");

  const [allWaves, setAllWaves] = useState([]);

  const [mining, setMining] = useState("");

  const [message, setMessage] = useState("");
  
  const contractAddress = "0x26EcA6DCe67C344D99D96359819cD942b3543fb8";

  const contractABI = abi.abi;

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an authorized account:", account);
        toast.success(account+" connected");
        setCurrentAccount(account);
        getTotalWaveCount();
        getAllWaves();
      } else {
        console.log("No authorized account found")
      }
    } catch (error) {
      toast.error(error);
      console.log(error);
    }
  }

  const switchToRinkebyChain = async () => {
    try {
        // check if the chain to connect to is installed
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4' }], // chainId must be in hexadecimal numbers
        });
      } catch (error) {
        // This error code indicates that the chain has not been added to MetaMask
        // if it is not, then install it into the user MetaMask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x4',
                  rpcUrl: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
                },
              ],
            });
          } catch (addError) {
            console.error(addError);
          }
        }
        console.error(error);
      }
  }
  /**
  * Implement your connectWallet method here
  */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        toast.warn("Please install 🦊 MetaMask");
        return;
      }

      await switchToRinkebyChain();

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
      toast.success(accounts[0]+" connected");
      getAllWaves();
      getTotalWaveCount();
    } catch (error) {
      toast.error(error.message);
      console.log(error)
    }
  }

  const wave = async () => {
    try {
      const { ethereum } = window; 
      if (ethereum) {
        if (!currentAccount) {
          await connectWallet();
        }
        await switchToRinkebyChain();
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
        let count = await wavePortalContract.getTotalWaves();
        setCurrentTotalWaveCount(count.toNumber());
        console.log("Retrieved total wave count...", count.toNumber());

        /*
        * Execute the actual wave from your smart contract
        */
        const waveTxn = await wavePortalContract.wave(message.toString(), { gasLimit: 300000 });
        setMining(1);
        console.log("Mining...", waveTxn.hash);

        await waveTxn.wait();
        console.log("Mined -- ", waveTxn.hash);

        setMining(0);

        setMessage("");

        toast.success("Waved");

        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        setCurrentTotalWaveCount(count.toNumber());
      } else {
        console.log("Ethereum object doesn't exist!");
        setMining(0);
      }
    } catch (error) {
      toast.error(error.message);
      console.log(error);
      setMining(0);
    }
  }

  const getTotalWaveCount = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        await switchToRinkebyChain();
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        let count = await wavePortalContract.getTotalWaves();
        setCurrentTotalWaveCount(count.toNumber());
        console.log("Retrieved total wave count...", count.toNumber());
        
        
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  }

  const getAllWaves = async () => {
    const { ethereum } = window;
    try {
      if (ethereum) {
        await switchToRinkebyChain();
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const waves = await wavePortalContract.getAllWaves();

        const wavesCleaned = waves.map(wave => {
        return {
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message,
        };
      });

        setAllWaves(wavesCleaned);
      } else {
        console.log("Ethereum object doesn't exist!")
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();

    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };
  
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
  
      wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
      wavePortalContract.on("NewWave", onNewWave);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };

  }, [])

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div>
          <ToastContainer 
            theme="dark"
            position="top-center"
            autoClose={3000}
            hideProgressBar
            newestOnTop={false}
            closeButton={false}
            transition={Slide}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover />
          <div className="left">
            <img className="avatar" src="https://wonderpals.mypinata.cloud/ipfs/QmYJ2vJ6ER2LGWuyRW4ZLgqm7iYjsKRRPteicviHczx1zS" alt="WonderPal #7098"/>
          </div>
          <div className="right">
            <div className="bio">
              <div className="header">
                👋 Hey there!
              </div>
              <div className="introTop">
                I am Ziyu, an App developer, who is entering the Web3 world.
              </div>
              <div className="bioTag">
                #Software Engineer #NFT Adventurer #Crypto #GameFi
              </div>
              <div className="biolinks">
                <button className="ens" onClick={() => {navigator.clipboard.writeText("80kpc.eth"); toast.success("Copied")}}>80kpc.eth</button>
  
                <a className="bioButton withBackground" target="_blank" href="https://twitter.com/caoziyu">
                  <img className="bioImage bioImageTwitter" alt="my twitter" src={twitterIcon}/>
                </a>
                <a className="bioButton withBackground" target="_blank" href="https://app.cyberconnect.me/address/80kpc.eth">
                  <img className="bioImageCyberConnect" alt="my cyberconnect" src={cyberConnectIcon}/>
                </a>
                <a className="bioButton withBackground" target="_blank" href="https://opensea.io/80KPC">
                  <img className="bioImage" alt="my opensea" src={openSeaIcon}/>
                </a>
                <a className="bioButton withBackground" target="_blank" href="https://mirror.xyz/80kpc.eth">
                  <img className="bioImageMirror" alt="my mirror" src={mirrorIcon}/>
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="intro">
          Connect your Ethereum wallet and wave at me on the blockchain to have a chance to win a small prize!
        </div>

        {currentAccount && (
          <input className="input"
            type="text"
            placeholder="Say whatever you want"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}

        {currentAccount && mining == 0 && (
          <button className="waveButton" onClick={wave}>
            Wave at Me
          </button>
        )}

        {mining != 0 && (
          <button disabled className="waveButtonDisabled">
            Pending...
          </button>
        )}

        {!currentAccount && (
          <button className="walletButton" onClick={connectWallet}>
            <img className="metaMaskIcon" src={metaMaskIcon}/><span className="cell">Connect Wallet</span>
          </button>
        )}
        

        <div className="divider">
          {mining != 0 && (
            <div>
              <div className="slide"/>
              <div className="slideDelay1"/>
              <div className="slideDelay2"/>
            </div>
          )}
        </div>
        
        {currentAccount && currentTotalWaveCount != -1 &&(
          <div className="waveCount">
            📮 Received {currentTotalWaveCount} waves
          </div>
        )}

        {allWaves.slice(0)
  .reverse().map((wave, index) => {
          return (
            <div key={index} className="waveItem">
              <div className="waveInfo">From: {wave.address}</div>
              <div className="waveInfo">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(wave.timestamp)}</div>
              <div className="waveMessage">{wave.message == "" ? <div className="large">👋</div> : wave.message}</div>
            </div>)
        })}
      </div>
    </div>
  );
}

export default App