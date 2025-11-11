import React, { useState } from 'react';
import './App.css'; 
// RiskCalculator.js が src フォルダにある前提でインポートします
import { runWorstCaseSimulation } from './RiskCalculator'; 

// 初期入力値 (デフォルト値を設定しておくと便利です)
const initialFormData = {
  annualIncomeDebtor: 5000000,
  annualRepayment: 1000000,
  loanAmount: 30000000,
  annualRentalIncomeGross: 2000000,
  annualExpensesRatio: 0.3,
  vacancyRateAssumption: 0.1,
  currentAnnualInterestRate: 0.03,
  otherDebtsRatio: 0.1,
};

function App() {
  // フォームの入力値を保持する状態 (state)
  const [formData, setFormData] = useState(initialFormData);
  // 結果を保持する状態
  const [results, setResults] = useState(null);

  // 入力フィールドの変更を処理する関数
  const handleChange = (e) => {
    const { name, value } = e.target;
    // 数値として扱いたい項目はparseFloatで変換
    setFormData(prevData => ({
      ...prevData,
      [name]: parseFloat(value) || 0, // 無効な値は0として扱う
    }));
  };

  // フォーム送信時（計算ボタンクリック時）の処理
  const handleSubmit = (e) => {
    e.preventDefault(); // ページの再読み込みを防ぐ
    
    // 計算ロジックに渡すデータ形式に調整
    const inputDataForCalculation = {
      ...formData,
      // 必須ではないが、計算に必要な固定値
      remainingYears: 20, 
    };

    // 計算ロジックを実行
    const calculationResults = runWorstCaseSimulation(inputDataForCalculation);
    
    // 結果を状態に保存し、結果画面を表示する準備
    setResults(calculationResults);
  };
  
  // 入力フィールドの定義リスト
  const inputFields = [
    { label: '主債務者の年収 (円)', name: 'annualIncomeDebtor', hint: '5000000', step: 100000 },
    { label: '年間の総返済額 (円)', name: 'annualRepayment', hint: '1000000', step: 100000 },
    { label: '借入総額 (円)', name: 'loanAmount', hint: '30000000', step: 1000000 },
    { label: '年間総家賃収入 (円)', name: 'annualRentalIncomeGross', hint: '2000000', step: 100000 },
    { label: '年間経費率 (0.0 - 1.0)', name: 'annualExpensesRatio', hint: '0.3', step: 0.01 },
    { label: '想定空室率 (0.0 - 1.0)', name: 'vacancyRateAssumption', hint: '0.1', step: 0.01 },
    { label: '現在の金利 (0.0 - 1.0)', name: 'currentAnnualInterestRate', hint: '0.03', step: 0.001 },
    { label: '他の負債の年収比率 (0.0 - 1.0)', name: 'otherDebtsRatio', hint: '0.1', step: 0.01 },
  ];

  // 結果が表示されている場合は、ResultScreenコンポーネントを表示
  if (results) {
    return <ResultScreen results={results} onBack={() => setResults(null)} />;
  }
  
  // 入力画面の表示
  return (
    <div className="app-container">
      <h1>連帯保証リスク予測 Webアプリ</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <h2>不動産投資案件の詳細入力</h2>
        
        {/* 入力フィールドの繰り返し表示 */}
        {inputFields.map((field) => (
          <div className="form-group" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              type="number"
              id={field.name}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              placeholder={field.hint}
              min="0"
              step={field.step}
              required
            />
          </div>
        ))}

        <button type="submit" className="calculate-button">
          リスクスコアを計算
        </button>
      </form>
      
      {/* 入力画面と結果画面で共通利用するCSSスタイル */}
      <style>{`
        .app-container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Inter', sans-serif; }
        h1 { color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; }
        h2 { color: #34495e; border-left: 5px solid #3498db; padding-left: 10px; margin-top: 25px; }
        .input-form { display: grid; gap: 15px; margin-top: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #34495e; }
        .form-group input { 
          width: 100%; 
          padding: 10px; 
          border: 1px solid #ccc; 
          border-radius: 4px; 
          box-sizing: border-box; 
          transition: border-color 0.3s;
        }
        .form-group input:focus { border-color: #3498db; outline: none; }
        
        .calculate-button { 
          padding: 15px; 
          background-color: #2ecc71; /* 緑系の色で「実行」を強調 */
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          font-size: 1.1em; 
          margin-top: 20px;
          transition: background-color 0.3s, transform 0.1s;
        }
        .calculate-button:hover { background-color: #27ae60; }
        .calculate-button:active { transform: scale(0.99); }
        
        /* 結果画面のスタイル */
        .summary-text { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 15px; color: #555; }
        .section-title { margin-top: 30px; padding-bottom: 5px; border-bottom: 2px solid #ddd; color: #333; }
        
        .result-card {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 5px solid; /* スコアの色で変化 */
            box-shadow: 0 4px 8px rgba(0,0,0,0.05);
            transition: transform 0.3s;
        }
        .result-card:hover { transform: translateY(-3px); }
        
        .result-card h3 { margin-top: 0; color: #333; }
        
        .score-area {
            font-size: 2.5em;
            margin: 10px 0;
            font-weight: 800;
        }
        
        .risk-level { margin-top: 0; font-size: 1.1em; }
        
        .detail-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #ccc;
            font-size: 0.95em;
            color: #555;
        }
        
        .simulation-grid {
            display: grid;
            gap: 20px;
        }
        
        /* 画面が広い場合は2列表示 */
        @media (min-width: 768px) {
            .simulation-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
        
        .back-button { 
            padding: 15px; 
            background-color: #6c757d; /* グレー */
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 1.1em; 
            margin-top: 30px;
            width: 100%;
            transition: background-color 0.3s, transform 0.1s;
        }
        .back-button:hover { background-color: #5a6268; }
        .back-button:active { transform: scale(0.99); }
      `}</style>
    </div>
  );
}

// ----------------------------------------------------
// 結果表示コンポーネント
// ----------------------------------------------------
function ResultScreen({ results, onBack }) {
    const { original, vacancy, rateHike, newRepaymentAmount } = results;

    // ヘルパー関数: スコアに応じて色とアイコンを決定
    const getRiskStyle = (score) => {
        if (score >= 70) {
            return { color: '#dc3545', icon: '🚨', background: '#f8d7da', level: '非常に高い' }; // Red
        } else if (score >= 50) {
            return { color: '#ffc107', icon: '⚠️', background: '#fff3cd', level: '高い' }; // Yellow
        } else if (score >= 30) {
            return { color: '#007bff', icon: '🔍', background: '#cfe2ff', level: '中程度' }; // Blue
        } else {
            return { color: '#28a745', icon: '✅', background: '#d1e7dd', level: '低い' }; // Green
        }
    };

    // UIパーツ: 個別の結果カード
    const ResultCard = ({ title, result, newRepayment = null }) => {
        const style = getRiskStyle(result.score);
        return (
            <div className="result-card" style={{ borderLeftColor: style.color, backgroundColor: style.background }}>
                <h3>{style.icon} {title}</h3>
                <div className="score-area" style={{ color: style.color }}>
                    スコア: <strong>{result.score}</strong> / 100
                </div>
                <p className="risk-level" style={{ fontWeight: 'bold' }}>
                    総合評価: {result.level}
                </p>
                
                {/* 詳細情報セクション */}
                <div className="detail-section">
                    <h4>分析詳細</h4>
                    <p>DCR (借入償還カバー率): {result.dcrValue.toFixed(2)} (目標: 1.20以上)</p>
                    <p>年間純収益 (NOI): {result.annualNetIncome ? result.annualNetIncome.toLocaleString() : 'N/A'} 円</p>
                    <p style={{ fontWeight: 600 }}>{result.dcrDetail}</p>
                    {newRepayment && (
                        <p style={{ marginTop: '10px' }}>金利上昇後の年間返済額: {(newRepayment).toLocaleString()} 円</p>
                    )}
                </div>
            </div>
        );
    };

    // ------------------------------------------------------------------
    // メインのレンダリング
    // ------------------------------------------------------------------
    return (
        <div className="app-container">
            <h1>連帯保証リスク分析結果</h1>
            <p className="summary-text">
                入力データに基づき、現在の状況と二つのワーストケースシナリオを評価しました。
            </p>

            {/* 1. 現状評価 (オリジナル) */}
            <h2 className="section-title">1. 現状のベースリスク</h2>
            <ResultCard title="現状のベースリスク" result={original} />

            {/* 2. シミュレーション結果 */}
            <h2 className="section-title">2. ワーストケース・シミュレーション</h2>
            <div className="simulation-grid">
                {/* 空室悪化シミュレーション */}
                <ResultCard 
                    title="空室率悪化シナリオ (20%想定)" 
                    result={vacancy} 
                />

                {/* 金利上昇シミュレーション */}
                <ResultCard 
                    title="金利上昇シナリオ (2%増想定)" 
                    result={rateHike} 
                    newRepayment={newRepaymentAmount} 
                />
            </div>

            <button onClick={onBack} className="back-button">
                入力画面に戻る
            </button>
            
        </div>
    );
}

export default App;