import { useState, useEffect } from 'react';
import { Compass, Wallet, Cpu, Lock, Database, FileText } from 'lucide-react';
import { submitCreditgateCircuit } from './midnightClient';
import { verifyCreditGateDeployment, validateCreditGateDeploymentRuntime } from './runtimeConfig';

const RUNTIME = validateCreditGateDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ credit_score_threshold: 700, validity: "false", certified_authority: "Equifax Credit Bureau Division" });
  const [formValues, setFormValues] = useState({ credit_score: 720, authority_sig: "sig:equifax:credit:approved" });
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Decrypting credit rating credential data...",
    "Confirming credit bureau issuer signature validity...",
    "Running ZK circuit checking: creditScore >= 700...",
    "Submitting loan gate eligibility proof..."
  ];

  const deploySteps = [
    "Compiling credit_gate.compact contract parameters...",
    "Spawning Preview transaction blocks...",
    "Anchoring credit authority keys directory..."
  ];

  useEffect(() => {
    fetch('/deployment.json')
      .then(response => {
        if (!response.ok) throw new Error('Lending Credit Verification: deployment.json could not be loaded.');
        return response.json();
      })
      .then(deployment => {
        const verified = verifyCreditGateDeployment(deployment);
        if (RUNTIME.contractAddress && RUNTIME.contractAddress !== verified.contractAddress) {
          throw new Error('Lending Credit Verification: environment address does not match deployment evidence.');
        }
        setContractAddress(verified.contractAddress);
        setContractDeployed(true);
        setRuntimeIssue(null);
      })
      .catch(error => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(error instanceof Error ? error.message : 'Lending Credit Verification: configuration failed.');
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values((window as any).midnight ?? {}).some((candidate: any) => typeof candidate?.connect === 'function');
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values((window as any).midnight ?? {}) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
      }>;
      const wallet = candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(RUNTIME.networkId);
      (window as any).__midnightConnectedWallet = connected;
      const addressInfo = await connected.getUnshieldedAddress();
      const balances = await connected.getUnshieldedBalances();
      const nightBalance = Object.values(balances)[0] ?? 0n;

      setWalletAddress(addressInfo.unshieldedAddress);
      setWalletBalance((Number(nightBalance) / 1_000_000).toFixed(2));
      setWalletConnected(true);
      setConnectedWallet(connected);
      if (import.meta.env.VITE_CONTRACT_ADDRESS) {
        setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
        setContractDeployed(true);
      }
      logTransaction('wallet', 'MIDNIGHT WALLET CONNECTED', '—', 'Connected through the Midnight DApp Connector API');
    } catch (err) {
      console.error('Midnight wallet connection failed:', err);
      alert(err instanceof Error ? err.message : 'Midnight wallet connection failed.');
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', 'LACE WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', 'Funding must be confirmed by the official Midnight Preview faucet and wallet balance refresh.');
  };

  const deployContractAction = async () => {
    if (!contractAddress || runtimeIssue) {
      alert('Lending Credit Verification: no verified Preview deployment is available.');
      return;
    }
    setContractDeployed(true);
    logTransaction('—', 'VERIFIED DEPLOYMENT ATTACHED', '—', `Using finalized Preview contract ${contractAddress}`);
  };

  const checkCredit = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    try {
      const result = await submitCreditgateCircuit((window as any).__midnightConnectedWallet, contractAddress, 'verifyCredit');
      setLedger(prev => ({ ...prev, validity: 'true' }));
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', 'Confirmed verifyCredit on ' + contractAddress);
      return;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
      return;
    }

  };

  const logTransaction = (hash: string, status: string, fee: string, details: string) => {
    setLogs(prev => [
      {
        hash,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status,
        fee,
        details
      },
      ...prev
    ]);
  };

  if (runtimeIssue) {
    return (
      <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', background: '#080b12', color: '#f8fafc' }}>
        <section style={{ width: 'min(620px, 100%)', border: '1px solid #ef4444', borderRadius: '18px', padding: '28px', background: '#151922' }}>
          <p style={{ margin: 0, color: '#fca5a5', fontWeight: 800, letterSpacing: '0.08em' }}>SAFE START BLOCKED</p>
          <h1 style={{ margin: '12px 0', fontSize: 'clamp(1.7rem, 5vw, 2.6rem)' }}>Lending Credit Verification</h1>
          <p style={{ lineHeight: 1.65, color: '#cbd5e1' }}>{runtimeIssue}</p>
          <p style={{ lineHeight: 1.65, color: '#94a3b8' }}>No wallet or contract operation was attempted. Restore this repository's own Preview deployment record, then reload.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '8px', padding: '12px 18px', border: 0, borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>Retry configuration</button>
        </section>
      </main>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '30px' }}>
        <div>
          <span style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '20px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)', fontWeight: 600 }}>Project 8</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '6px' }}>Lending Credit Verification</h1>
        </div>
        <div>
          {walletConnected ? (
            <div style={{ background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '12px', padding: '8px 16px' }}>
              Balance: <strong style={{ color: '#06b6d4' }}>{walletBalance} tNIGHT</strong>
            </div>
          ) : (
            <button onClick={connectLace} style={{ width: 'auto' }}>Connect Lace Wallet</button>
          )}
        </div>
      </header>

<section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard__lead">
          <span className="home-kicker">Credit desk</span>
          <h2 id="home-dashboard-title">Underwriting gate</h2>
          <p>Show eligibility to a lender without revealing the score.</p>
          <div className="home-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')}>Open Workspace</button>
            <button type="button" className="home-secondary" onClick={() => setActiveTab('privacy')}>Read Privacy Model</button>
          </div>
        </div>
        <div className="home-dashboard__grid">
          <article className="home-card"><span>Network</span><strong>Midnight Preview</strong><small>{contractDeployed ? 'Contract verified' : 'Contract setup pending'}</small></article>
          <article className="home-card"><span>Current signal</span><strong>700 score threshold</strong><small>Bureau signature required</small></article>
          <article className="home-card"><span>Wallet session</span><strong>{walletConnected ? 'Connected' : 'Not connected'}</strong><small>{walletConnected ? walletBalance + ' tNIGHT available' : 'Connect 1AM to continue'}</small></article>
          <article className="home-card"><span>Contract address</span><strong className="home-address">{contractAddress ? contractAddress.slice(0, 14) + '…' : 'Awaiting deployment'}</strong><small>Unique project deployment</small></article>
        </div>
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'dashboard' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🏦 Lending Application</button>
        <button onClick={() => setActiveTab('deployer')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'deployer' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'deployer' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>📑 Credit Scoring Deployer</button>
        <button onClick={() => setActiveTab('walletHub')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'walletHub' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'walletHub' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>📡 Bureau Wallet</button>
        <button onClick={() => setActiveTab('privacy')} style={{ width: 'auto', padding: '10px 20px', background: activeTab === 'privacy' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'privacy' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>🔒 Credit Score Privacy</button>
      </div>

      <main style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {(!walletConnected || !contractDeployed) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f87171' }}>⚠️ Setup Required</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  {!walletConnected ? "Please connect your Lace Wallet in the Wallet Hub." : "Please deploy the Compact contract in the ZK Deployer."}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', opacity: (walletConnected && contractDeployed) ? 1 : 0.4, pointerEvents: (walletConnected && contractDeployed) ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c5f2f7' }}><Database className="w-5 h-5" /> Requirements Parameters</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MINIMUM CREDIT RATING SCORE</span>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{ledger.credit_score_threshold}+</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CERTIFYING CREDIT BUREAU AUTHORITY</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginTop: '4px' }}>{ledger.certified_authority}</div>
                    </div>
                  </div>
                </section>

                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ZK CREDIT CHECK ELIGIBILITY STATUS</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '8px', color: ledger.validity === "true" ? 'var(--color-success)' : '#ef4444' }}>
                    {ledger.validity === "true" ? "✓ CREDIT STATUS APPROVED" : "✕ UNVERIFIED / REJECTED STATUS"}
                  </div>
                </section>
              </div>

              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#c5f2f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Compass className="w-5 h-5" /> Credential Signature Checks
                  </h2>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Your Private Credit Rating Score</label>
                    <input 
                      type="number" 
                      value={formValues.credit_score} 
                      onChange={e => setFormValues({ ...formValues, credit_score: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Bureau Authority Key Signature</label>
                    <input 
                      type="text" 
                      value={formValues.authority_sig} 
                      onChange={e => setFormValues({ ...formValues, authority_sig: e.target.value })}
                    />
                  </div>
                  <button onClick={checkCredit} disabled={isProving}>
                    {isProving ? "Generating rating validation proof..." : "Prove Score Eligibility"}
                  </button>

                  {isProving && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(6,182,212,0.05)', border: '1px dashed #06b6d4', borderRadius: '8px', fontSize: '0.8rem' }}>
                      {proofSteps.map((step, idx) => (
                        <div key={idx} style={{ padding: '3px 0', color: idx === provingStep ? 'white' : 'var(--text-secondary)', opacity: idx <= provingStep ? 1 : 0.4 }}>
                          {idx < provingStep ? '✓' : '●'} {step}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#c5f2f7' }}>
              <Cpu className="w-6 h-6" /> Credit Gate Deployer
            </h2>
            {contractDeployed ? (
              <p style={{ color: '#10b981' }}>Deployed Preview Address: {contractAddress}</p>
            ) : (
              <button onClick={deployContractAction} disabled={isDeploying || !walletConnected}>
                {isDeploying ? "Deploying..." : "Compile & Deploy Contract"}
              </button>
            )}

            {isDeploying && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(6, 182, 212, 0.05)', border: '1px dashed #06b6d4', borderRadius: '8px', fontSize: '0.8rem' }}>
                {deploySteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '3px 0', color: idx === deployStep ? 'white' : 'var(--text-secondary)', opacity: idx <= deployStep ? 1 : 0.4 }}>
                    {idx < deployStep ? '✓' : '●'} {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'walletHub' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#c5f2f7' }}>
              <Wallet className="w-6 h-6" /> Wallet Hub & Logs
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Lace Account</h3>
                {walletConnected ? (
                  <div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem', marginBottom: '10px' }}>{walletAddress}</div>
                    <button onClick={disconnectLace} style={{ width: 'auto', background: '#dc2626' }}>Disconnect</button>
                  </div>
                ) : (
                  <button onClick={connectLace} style={{ width: 'auto' }}>Connect Wallet</button>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px' }}>
                <h3>Get tNIGHT</h3>
                <button onClick={requestFaucet} disabled={!walletConnected || faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Mint Faucet Tokens"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#c5f2f7' }}>
              <Lock className="w-6 h-6" /> Zero-Knowledge Privacy Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#10b981' }}>Can Learn:</h3>
                <ul>
                  <li>Minimum threshold parameters requirement.</li>
                  <li>Bureau public key registry anchor values.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '24px', borderRadius: '12px' }}>
                <h3 style={{ color: '#f87171' }}>Cannot Learn:</h3>
                <ul>
                  <li>Specific credit rating integer of the loan applicant.</li>
                  <li>User signature keys or keys.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
