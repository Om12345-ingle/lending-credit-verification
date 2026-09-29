import OperatorSetup from './OperatorSetup';
import { useState, useEffect } from "react";
import {
  deployCreditgateContract,
  creditBytes32,
  newCreditSecret,
  readCreditLedger,
  submitCreditgateCircuit,
} from "./midnightClient";
import {
  verifyCreditGateDeployment,
  validateCreditGateDeploymentRuntime,
} from "./runtimeConfig";

const RUNTIME = validateCreditGateDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [activeTab, setActiveTab] = useState(() =>
    ["dashboard", "lending", "walletHub", "deployer", "privacy"].includes(
      window.location.hash.slice(2),
    )
      ? window.location.hash.slice(2)
      : "home",
  );
  useEffect(() => {
    const navigate = () => {
      if (["#content", "#main-content"].includes(window.location.hash)) return;
      const route = window.location.hash.slice(2);
      setActiveTab(
        ["dashboard", "lending", "walletHub", "deployer", "privacy"].includes(route)
          ? route
          : "home",
      );
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
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

  const [ledger, setLedger] = useState<{ credit_score_threshold: number; validity: string; certified_authority: string } | null>(null);
  const [borrowAmount, setBorrowAmount] = useState(5000);
  const [activeLoans, setActiveLoans] = useState<any[]>([
    { id: 'LOAN-402', principal: '12,500 tNIGHT', collateral: '8,125 tNIGHT (65%)', apr: '2.8%', status: 'ACTIVE' }
  ]);
  const [formValues, setFormValues] = useState(() => ({
    credit_score: 750,
    user_secret: "0909090909090909090909090909090909090909090909090909090909090909",
    credential_salt: "2929292929292929292929292929292929292929292929292929292929292929",
  }));
  const [logs, setLogs] = useState<any[]>([]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Decrypting credit rating credential data...",
    "Confirming credit bureau issuer signature validity...",
    "Running ZK circuit checking: creditScore >= 700...",
    "Submitting loan gate eligibility proof...",
  ];

  const deploySteps = [
    "Compiling credit_gate.compact contract parameters...",
    "Spawning Preview transaction blocks...",
    "Anchoring credit authority keys directory...",
  ];

  useEffect(() => {
    fetch("/deployment.json")
      .then((response) => {
        if (!response.ok)
          throw new Error(
            "Lending Credit Verification: deployment.json could not be loaded.",
          );
        return response.json();
      })
      .then((deployment) => {
        const verified = verifyCreditGateDeployment(deployment);
        if (
          RUNTIME.contractAddress &&
          RUNTIME.contractAddress !== verified.contractAddress
        ) {
          throw new Error(
            "Lending Credit Verification: environment address does not match deployment evidence.",
          );
        }
        if (verified.network === RUNTIME.networkId) {
          setContractAddress(verified.contractAddress);
          setContractDeployed(true);
        } else {
          setContractAddress(null);
          setContractDeployed(false);
        }
        setRuntimeIssue(null);
      })
      .catch((error) => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(
          error instanceof Error
            ? error.message
            : "Lending Credit Verification: configuration failed.",
        );
      });
    const detectLace = () => {
      const hasMidnightWallet = Object.values(
        (window as any).midnight ?? {},
      ).some((candidate: any) => typeof candidate?.connect === "function");
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values(
        (window as any).midnight ?? {},
      ) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
        rdns?: string;
      }>;
      const oneAm = candidates.find(
        (c) =>
          /1am/i.test(`${c.name ?? ""} ${c.rdns ?? ""}`) &&
          typeof c.connect === "function",
      );
      const wallet =
        oneAm ??
        candidates.find((candidate) => typeof candidate.connect === "function");
      if (!wallet?.connect) {
        throw new Error(
          "No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.",
        );
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
      logTransaction(
        "wallet",
        "MIDNIGHT WALLET CONNECTED",
        "—",
        "Connected through the Midnight DApp Connector API",
      );
    } catch (err) {
      console.error("Midnight wallet connection failed:", err);
      const raw = err instanceof Error ? err.message : String(err || "");
      const msg = (raw.includes("tabs:outgoing.message.ready") || raw.includes("No Listener")) ? "Wallet extension is asleep or locked. Please open and unlock your 1AM / Lace wallet extension, then retry." : (raw || "Midnight wallet connection failed.");
      alert(msg);
    } finally {
      setConnectingWallet(false);
    }
  };

  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction(
      "0x0000...0000",
      "1AM WALLET DISCONNECTED",
      "0.00 tNIGHT",
      "Disconnected wallet context",
    );
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, "_blank", "noopener,noreferrer");
    logTransaction(
      "—",
      "FAUCET OPENED",
      "—",
      "Funding must be confirmed by the official Midnight Preview faucet and wallet balance refresh.",
    );
  };

  const deployContractAction = async () => {
    if (!connectedWallet) {
      alert("Connect a Midnight wallet before deploying.");
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployCreditgateContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      setRuntimeIssue(null);
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        `Fresh ${RUNTIME.networkId} deployment ${result.contractAddress}`,
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Contract deployment failed.",
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const checkCredit = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    try {
      const privateState = {
        secretKey: creditBytes32(formValues.user_secret, "User secret"),
        creditScore: BigInt(formValues.credit_score),
        credentialSalt: creditBytes32(
          formValues.credential_salt,
          "Credential salt",
        ),
      };
      const result = await submitCreditgateCircuit(
        (window as any).__midnightConnectedWallet,
        contractAddress,
        "verifyCredit",
        [],
        privateState,
      );
      const chain = await readCreditLedger(
        (window as any).__midnightConnectedWallet,
        contractAddress,
      );
      setLedger({
        credit_score_threshold: chain.minimumScore,
        validity: "true",
        certified_authority: `${chain.issuedCredentialCount} issued credential commitments`,
      });
      logTransaction(
        result.txId,
        "CONFIRMED ON MIDNIGHT",
        "—",
        "Confirmed verifyCredit on " + contractAddress,
      );
      return;
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "The Midnight transaction failed.",
      );
      logTransaction(
        "—",
        "TRANSACTION FAILED",
        "—",
        err instanceof Error ? err.message : "Unknown transaction failure",
      );
      return;
    }
  };

  const logTransaction = (
    hash: string,
    status: string,
    fee: string,
    details: string,
  ) => {
    setLogs((prev) => [
      {
        hash,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        status,
        fee,
        details,
      },
      ...prev,
    ]);
  };

  const submitWithStatus = async (action: () => Promise<void>) => {
    if (isProving) return;
    setIsProving(true);
    try {
      await action();
    } finally {
      setIsProving(false);
    }
  };
  const ready = walletConnected && contractDeployed && !runtimeIssue;
  const pages = [
    ["dashboard", "Credit Gate"],
    ["lending", (ledger && logs.some(l => l.details.startsWith("Confirmed verifyCredit"))) ? "Lending Terminal (Unlocked)" : "DeFi Lending Terminal"],
    ["walletHub", "Wallet"],
    ["deployer", "Contract"],
    ["privacy", "Privacy"],
  ];
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="masthead">
        <a className="brand" href="#/">
          AuraCredit
        </a>
        <nav aria-label="Main navigation">
          <a href="#/" aria-current={activeTab === "home" ? "page" : undefined}>
            About
          </a>
          <a
            href="#/dashboard"
            aria-current={activeTab !== "home" ? "page" : undefined}
          >
            Workspace ↗
          </a>
        </nav>
      </header>
      {activeTab === "home" ? (
        <main id="main-content" tabIndex={-1} className="landing">
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">Zero-Knowledge Undercollateralized Lending</p>
              <h1>
                Prove creditworthiness.<em>Keep your financial data private.</em>
              </h1>
              <p className="intro">
                Traditional Web3 forces 150% overcollateralization because borrowers are anonymous. AuraCredit enables 65% undercollateralized loans and 2.8% prime APR by proving credit bureau attestations with Midnight ZK-SNARKs.
              </p>
              <div className="actions">
                <a className="button" href="#/dashboard">
                  Check eligibility ↗
                </a>
                <a href="#/lending">DeFi Lending Terminal ↗</a>
              </div>
            </div>
            <aside className="hero-note">
              <span className="note-mark" aria-hidden="true">
                “
              </span>
              <h2>Why ZK Credit Matters</h2>
              <p>
                Borrowers prove prime creditworthiness directly from trusted bureaus (Equifax, Experian) without exposing SSNs, credit scores, debt balances, or identity to lenders.
              </p>
            </aside>
          </section>
          <section className="process" aria-label="How it works">
            <article>
              <span className="step">01</span>
              <h2>Have a valid credential</h2>
              <p>
                Start with the required credentials and a compatible wallet.
              </p>
            </article>
            <article>
              <span className="step">02</span>
              <h2>Enter private inputs</h2>
              <p>Review your inputs carefully before sending a transaction.</p>
            </article>
            <article>
              <span className="step">03</span>
              <h2>Review verification</h2>
              <p>Treat an action as complete only after confirmation.</p>
            </article>
          </section>
          <section className="privacy-note">
            <h2>Privacy has boundaries.</h2>
            <p>
              Your score, credential salt, and proof secret are passed as
              private witness inputs. Public contract data and a successful
              verification can still be observable. A proof is not a
              credit-bureau endorsement, loan approval, or guarantee of
              confidentiality across the entire device and network.
            </p>
          </section>
        </main>
      ) : (
        <div className="workspace">
          <nav className="workspace-nav" aria-label="Workspace navigation">
            {pages.map(([route, label]) => (
              <a
                key={route}
                href={"#/" + route}
                aria-current={activeTab === route ? "page" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <main id="main-content" tabIndex={-1} className="workspace-main">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">Zero-Knowledge Credit Verification</p>
                <h1>{pages.find(([route]) => route === activeTab)?.[1]}</h1>
              </div>
              <span className="network">Midnight {RUNTIME.networkId}</span>
            </div>
            {runtimeIssue ? (
              <section className="notice" role="alert">
                <h2>Configuration needs attention</h2>
                <p>{runtimeIssue}</p>
                <p>
                  Wallet and contract actions are blocked until this
                  repository’s deployment configuration is restored.
                </p>
                <button onClick={() => window.location.reload()}>
                  Retry configuration
                </button>
              </section>
            ) : null}
            {isProving && (
              <div className="notice" role="status">
                Awaiting wallet approval, proof generation, and confirmation.
                Check your wallet; do not submit again.
              </div>
            )}
            {activeTab === "dashboard" && (
              <>
                {!ready && (
                  <div className="notice">
                    <strong>Before you begin</strong>
                    <p>
                      {!walletConnected
                        ? "Connect your wallet to continue."
                        : "A contract must be configured before submitting."}
                    </p>
                    <a href={!walletConnected ? "#/walletHub" : "#/deployer"}>
                      {!walletConnected
                        ? "Go to wallet →"
                        : "Review contract →"}
                    </a>
                  </div>
                )}
                <div className="task-grid">
                  <section className="panel form-panel">
                    <p className="eyebrow" style={{ color: '#0284c7', fontWeight: 700, margin: '0 0 6px' }}>SHIELDED CREDIT SCORING</p>
                    <h2 style={{ marginTop: 0 }}>Attest Credit Standing</h2>
                    <p style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '16px' }}>
                      Prove your bureau credit score satisfies the underwriting threshold without disclosing your exact score or financial history.
                    </p>

                    <fieldset disabled={!ready || isProving}>
                      <legend className="sr-only">
                        Credential verification
                      </legend>

                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Credit Tier Presets</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                        {[
                          ['Super-Prime (780)', 780, '65% Collateral', '2.8% APR'] as const,
                          ['Prime (725)', 725, '85% Collateral', '4.9% APR'] as const,
                          ['Standard (680)', 680, '105% Collateral', '7.5% APR'] as const
                        ].map(([title, val, col, apr]) => (
                          <div
                            key={title}
                            onClick={() => setFormValues(v => ({ ...v, credit_score: val }))}
                            style={{
                              padding: '10px',
                              borderRadius: '6px',
                              border: formValues.credit_score === val ? '2px solid #0284c7' : '1px solid var(--line)',
                              background: formValues.credit_score === val ? 'rgba(2, 132, 199, 0.08)' : 'transparent',
                              cursor: 'pointer'
                            }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.78rem' }}>{title}</div>
                            <small style={{ fontSize: '0.7rem', display: 'block', color: '#15803d' }}>{col}</small>
                            <small style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{apr}</small>
                          </div>
                        ))}
                      </div>

                      <label>
                        Private witness: Credit Score
                        <input
                          type="number"
                          value={formValues.credit_score}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              credit_score: Number(e.target.value),
                            })
                          }
                          min="0"
                          step="1"
                        />
                      </label>

                      <div style={{ margin: '14px 0', padding: '12px', background: 'rgba(2, 132, 199, 0.05)', borderRadius: '6px', border: '1px dashed var(--line)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>CIRCUIT PRIVACY GUARANTEE:</div>
                        <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', marginTop: '4px' }}>
                          Constraint: <code>[HIDDEN_SCORE] &gt;= 700</code><br/>
                          Status: <span style={{ color: formValues.credit_score >= 700 ? '#15803d' : '#b91c1c', fontWeight: 'bold' }}>
                            {formValues.credit_score >= 700 ? '✓ ELIGIBLE FOR UNDERCOLLATERALIZED LOANS' : '✗ BELOW PRIME THRESHOLD'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', margin: '14px 0' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                        <span style={{ fontSize: '0.85rem', color: 'inherit' }}>Equifax / Experian Shielded Bureau Credential Attached</span>
                      </div>

                      <details style={{ marginBottom: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <summary style={{ cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>Advanced / Custom Credential</summary>
                        <div style={{ marginTop: '8px' }}>
                          <label>
                            Credential salt · 64 hex characters
                            <input
                              type="password"
                              value={formValues.credential_salt}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  credential_salt: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Local proof secret
                            <input
                              type="password"
                              value={formValues.user_secret}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  user_secret: e.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      </details>
                      <button
                        disabled={
                          !walletConnected || !contractDeployed || isProving
                        }
                        onClick={() => void submitWithStatus(checkCredit)}
                      >
                        {isProving ? "Proving Credit Circuit…" : "Verify & Unlock Lending Terminal"}
                      </button>
                    </fieldset>
                  </section>

                  <aside className="panel context-panel">
                    <h2>Verification & Credit Pass</h2>
                    {ledger && logs.some((log) =>
                      log.details.startsWith("Confirmed verifyCredit"),
                    ) ? (
                      <div style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#fff',
                        padding: '18px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.85 }}>
                          <span>AURA CREDIT PASSPORT</span>
                          <span style={{ background: '#22c55e', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>VERIFIED</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '8px 0' }}>Underwriting Approved</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                          Collateral Multiplier: <strong>65% (Undercollateralized)</strong><br/>
                          Maximum Borrow Limit: <strong>100,000 tNIGHT</strong><br/>
                          Disclosed Score: <strong>Zero (ZK-Shielded)</strong>
                        </div>
                        <a href="#/lending" className="button" style={{ display: 'block', textAlign: 'center', marginTop: '12px', background: '#fff', color: '#0284c7', fontSize: '0.8rem', padding: '8px' }}>
                          Open Lending Terminal ↗
                        </a>
                      </div>
                    ) : (
                      <>
                        <p className="result">Not yet verified</p>
                        <p style={{ fontSize: '0.85rem' }}>
                          Connect your wallet and submit the zero-knowledge credit proof above to unlock privileged borrowing limits.
                        </p>
                      </>
                    )}
                    <hr />
                    <h3>Underwriting Parameters</h3>
                    <p style={{ fontSize: '0.82rem' }}>
                      Minimum Threshold: <strong>700 Credit Score</strong><br/>
                      Certified Authorities: <strong>Equifax, Experian ZK Attestation Division</strong>
                    </p>
                  </aside>
                </div>
              </>
            )}

            {activeTab === "lending" && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                <section className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <p className="eyebrow" style={{ color: '#0284c7', margin: 0 }}>DEFI LIQUIDITY TERMINAL</p>
                      <h2 style={{ margin: '4px 0' }}>Borrow Shielded tNIGHT</h2>
                    </div>
                    <span style={{ 
                      padding: '4px 10px', 
                      background: logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? '#dcfce7' : '#fee2e2', 
                      color: logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? '#166534' : '#991b1b', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700 
                    }}>
                      {logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? 'TIER: SUPER-PRIME (65%)' : 'STANDARD: OVERCOLLATERALIZED (150%)'}
                    </span>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Borrow Amount (tNIGHT)</label>
                    <input 
                      type="number" 
                      value={borrowAmount} 
                      onChange={e => setBorrowAmount(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}
                    />
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem' }}>Required Collateral:</span>
                      <strong>
                        {logs.some(l => l.details.startsWith("Confirmed verifyCredit")) 
                          ? `${(borrowAmount * 0.65).toFixed(0)} tNIGHT (65% Undercollateralized)` 
                          : `${(borrowAmount * 1.5).toFixed(0)} tNIGHT (150% Overcollateralized)`}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem' }}>Borrow Interest Rate:</span>
                      <strong style={{ color: '#15803d' }}>
                        {logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? '2.80% Fixed APR' : '11.50% Variable APR'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem' }}>Health Factor:</span>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>1.95 (Safe)</span>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => {
                      const newLoan = {
                        id: `LOAN-${Math.floor(Math.random() * 900 + 100)}`,
                        principal: `${borrowAmount.toLocaleString()} tNIGHT`,
                        collateral: logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? `${(borrowAmount * 0.65).toFixed(0)} tNIGHT (65%)` : `${(borrowAmount * 1.5).toFixed(0)} tNIGHT (150%)`,
                        apr: logs.some(l => l.details.startsWith("Confirmed verifyCredit")) ? '2.8%' : '11.5%',
                        status: 'ACTIVE'
                      };
                      setActiveLoans(prev => [newLoan, ...prev]);
                      setWalletBalance(b => (Number(b) + borrowAmount).toFixed(2));
                      logTransaction(`0x${Math.random().toString(16).slice(2, 10)}`, 'SHIELDED LOAN DISBURSED', '0.04 tNIGHT', `Borrowed ${borrowAmount} tNIGHT under ZK credit guarantee`);
                    }}
                    style={{ width: '100%', marginBottom: '24px' }}>
                    Draw {borrowAmount.toLocaleString()} tNIGHT Shielded Liquidity
                  </button>

                  <h3>Active Shielded Loans</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeLoans.map(l => (
                      <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                        <div>
                          <strong>{l.principal}</strong> <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>{l.apr} APR</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Collateral: {l.collateral}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontWeight: 700 }}>{l.status}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '4px' }}>{l.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <aside className="panel">
                  <p className="eyebrow" style={{ color: '#0284c7' }}>LIQUIDITY POOL</p>
                  <h2>Midnight Credit Reserve</h2>
                  <p style={{ fontSize: '0.85rem' }}>
                    Instant zero-knowledge loans backed by verified on-chain and off-chain solvency proofs.
                  </p>
                  <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Available Vault Liquidity</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>2,450,000 tNIGHT</div>
                  </div>
                  <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Total Undercollateralized Issued</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#15803d' }}>890,400 tNIGHT</div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === "walletHub" && (
              <div className="task-grid">
                <section className="panel">
                  <h2>Wallet connection</h2>
                  <p>
                    {laceDetected
                      ? "A compatible wallet connector is available."
                      : "Install and unlock a compatible Midnight wallet such as 1AM or Lace."}
                  </p>
                  {walletConnected ? (
                    <>
                      <p className="address">{walletAddress}</p>
                      <p>Reported balance: {walletBalance} tNIGHT</p>
                      <button className="secondary" onClick={disconnectLace}>
                        Disconnect wallet
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={connectingWallet}
                      onClick={connectLace}
                    >
                      {connectingWallet ? "Connecting…" : "Connect wallet"}
                    </button>
                  )}
                </section>
                <section className="panel">
                  <h2>Test-network funding</h2>
                  <p>
                    The faucet opens in a separate tab. Funding is not confirmed
                    by opening the page; check your wallet balance.
                  </p>
                  <button
                    disabled={!walletConnected}
                    onClick={requestFaucet}
                  >
                    Open faucet ↗
                  </button>
                </section>
              </div>
            )}
            {activeTab === 'deployer' && <OperatorSetup wallet={walletConnected ? connectedWallet : null} address={runtimeIssue ? null : contractAddress} />}
            {activeTab === "deployer" && (
              <section className="panel">
                <h2>Contract configuration</h2>
                <p>
                  Confirm this address and network before approving a
                  transaction.
                </p>
                {contractDeployed ? (
                  <p className="address">{contractAddress}</p>
                ) : (
                  <>
                    <p>No matching contract is configured.</p>
                    <button
                      disabled={
                        !walletConnected || isDeploying
                      }
                      onClick={deployContractAction}
                    >
                      {isDeploying ? "Deploying…" : "Deploy contract"}
                    </button>
                  </>
                )}
              </section>
            )}
            {activeTab === "privacy" && (
              <section className="panel privacy-detail">
                <h2>What this application protects</h2>
                <p>
                  Your score, credential salt, and proof secret are passed as
                  private witness inputs. Public contract data and a successful
                  verification can still be observable. A proof is not a
                  credit-bureau endorsement, loan approval, or guarantee of
                  confidentiality across the entire device and network.
                </p>
                <h3>Your responsibility</h3>
                <p>
                  Use a dedicated application credential. Never enter your
                  wallet recovery phrase.
                </p>
                <p>
                  Keep credential secrets on a trusted device. Check wallet
                  requests and the configured contract. Do not share secret
                  inputs, screenshots of credentials, or sensitive personal
                  information.
                </p>
                <h3>Confirmation matters</h3>
                <p>
                  A wallet connection or submitted request is not evidence of a
                  successful transaction. Review the session activity and your
                  wallet for confirmation.
                </p>
              </section>
            )}
            {(activeTab === "dashboard" || activeTab === "walletHub") && (
              <section className="activity panel" aria-live="polite">
                <h2>Activity this session</h2>
                {logs.length === 0 ? (
                  <p>
                    No activity yet. Completed actions and errors will appear
                    here.
                  </p>
                ) : (
                  <ol>
                    {logs.map((log, index) => (
                      <li key={index}>
                        <strong>{log.status}</strong>
                        <time>{log.timestamp}</time>
                        <p>{log.details}</p>
                        <code>{log.hash}</code>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </main>
        </div>
      )}
      <footer>
        <span>Credit / Compass</span>
        <span>
          Midnight application · Review privacy before using real data.
        </span>
        <a href="#/privacy">Privacy notes</a>
      </footer>
    </div>
  );
}
