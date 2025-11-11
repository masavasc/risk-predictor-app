import React, { useState, useMemo } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

// --- 定数 ---
const WORST_CASE_VACANCY_RATE = 0.20; // 空室率悪化シナリオとして20%を固定

// 初期値の型定義
const initialInput = {
  annualIncome: 5000000,
  annualRepayment: 1000000,
  totalDebt: 30000000,
  annualRentIncome: 2000000,
  expenseRate: 0.3, // 年間経費率 (0.0 - 1.0)
  vacancyRate: 0.1, // 想定空室率 (0.0 - 1.0)
  interestRate: 0.03, // 現在の金利 (0.0 - 1.0)
  simulatedInterestRate: 0.04, // シミュレーション用金利 (初期値 4%に設定)
  otherDebtRatio: 0.1, // 他の負債の年収比 (0.0 - 1.0)
};

// 年間返済額を再計算する簡易関数 (簡略化のため、元本と利息の比率を考慮せず、総負債と金利から増額分のみ概算)
const estimateIncreasedRepayment = (totalDebt, currentRate, newRate) => {
    // 簡略化された方法で、金利上昇による年間返済額の増加分を概算
    // 金利差に対して総負債を乗じ、概算係数(0.7)で調整
    return totalDebt * (newRate - currentRate) * 0.7; 
};

// 計算ロジックをカプセル化した関数
const calculateRiskScore = (input) => {
  const {
    annualIncome,
    annualRepayment,
    totalDebt,
    annualRentIncome,
    expenseRate,
    vacancyRate,
    interestRate,
    simulatedInterestRate,
    otherDebtRatio,
  } = input;

  // 1. 債務者信用力の評価 (Credit Score: 0 - 30点)
  const debtToIncomeRatio = annualRepayment / (annualIncome || 1);
  const totalDebtToIncomeRatio = totalDebt / (annualIncome || 1);

  let creditScore = 30;
  if (debtToIncomeRatio > 0.3) creditScore -= 5;
  if (totalDebtToIncomeRatio > 5) creditScore -= 10;
  if (otherDebtRatio > 0.2) creditScore -= 5;
  if (creditScore < 0) creditScore = 0;

  // 2. 物件収益力の評価 (Property Score: 0 - 40点)
  // NOI (Net Operating Income) = 年間家賃収入 * (1 - 空室率) * (1 - 経費率)
  const noi = annualRentIncome * (1 - vacancyRate) * (1 - expenseRate);
  const currentDcsr = noi / (annualRepayment || 1); // DCSR (Debt Service Coverage Ratio)

  let propertyScore = 40;
  if (currentDcsr < 1.2) propertyScore -= 10;
  if (currentDcsr < 1.0) propertyScore -= 15;
  if (expenseRate > 0.4) propertyScore -= 5;
  if (vacancyRate > 0.15) propertyScore -= 5;
  if (propertyScore < 0) propertyScore = 0;
  
  // 3. 金利リスクの評価 (Current Interest Rate Risk: 0 - 30点)
  let interestRiskScore = 30;
  if (interestRate > 0.04) interestRiskScore -= 10;
  if (interestRate > 0.05) interestRiskScore -= 10;
  if (totalDebtToIncomeRatio > 8) interestRiskScore -= 5;
  if (interestRiskScore < 0) interestRiskScore = 0;

  // 4. 金利上昇シミュレーション
  const increasedRepayment = estimateIncreasedRepayment(totalDebt, interestRate, simulatedInterestRate);
  const simulatedRepayment = annualRepayment + increasedRepayment;
  const simulatedDcsr = noi / (simulatedRepayment || 1);
  
  let simulatedRiskLevel = '低';
  let simulatedRiskDetail = 'シミュレーション金利でもリスクは低いままです。';
  
  if (simulatedDcsr < 1.2) {
    simulatedRiskLevel = '中';
    simulatedRiskDetail = `シミュレーション金利（${(simulatedInterestRate * 100).toFixed(2)}%）では、DCSRが${simulatedDcsr.toFixed(2)}まで低下し、リスクは中程度に上昇します。`;
  }
  if (simulatedDcsr < 1.0) {
    simulatedRiskLevel = '高';
    simulatedRiskDetail = `シミュレーション金利（${(simulatedInterestRate * 100).toFixed(2)}%）では、DCSRが1.0を下回り、収益が返済額を下回る高いリスクがあります。`;
  }

  // 5. 空室率悪化シミュレーション (20%固定)
  // 年間返済額は現状のまま、空室率を悪化させる (20%を適用)
  const worstCaseVacancyNoi = annualRentIncome * (1 - WORST_CASE_VACANCY_RATE) * (1 - expenseRate);
  const worstCaseVacancyDcsr = worstCaseVacancyNoi / (annualRepayment || 1);

  let vacancyRiskLevel = '低';
  let vacancyRiskDetail = `空室率${WORST_CASE_VACANCY_RATE * 100}%のケースでもDCSRは${worstCaseVacancyDcsr.toFixed(2)}で、安定しています。`;

  if (worstCaseVacancyDcsr < 1.2) {
    vacancyRiskLevel = '中';
    vacancyRiskDetail = `空室率が${WORST_CASE_VACANCY_RATE * 100}%に悪化すると、DCSRが${worstCaseVacancyDcsr.toFixed(2)}まで低下し、収益性が中程度のリスクにさらされます。`;
  }
  if (worstCaseVacancyDcsr < 1.0) {
    vacancyRiskLevel = '高';
    vacancyRiskDetail = `空室率が${WORST_CASE_VACANCY_RATE * 100}%に悪化すると、DCSRが1.0を下回り、収益が返済額を下回る高いリスクがあります。`;
  }
  
  // 最終スコア (合計 100点満点)
  const finalScore = creditScore + propertyScore + interestRiskScore;

  // 現在のリスク判定
  let riskLevel = '低';
  let riskDetail = '債務者・物件収益性ともに優れており、連帯保証リスクは非常に低いと評価されます。';

  if (finalScore < 80) {
    riskLevel = '中';
    riskDetail = '一部の財務指標に改善の余地があります。詳細な内訳（信用力、収益力）を確認し、懸念点を特定してください。';
  }
  if (finalScore < 50) {
    riskLevel = '高';
    riskDetail = '信用力または物件収益力に大きな懸念があります。連帯保証人として引き受ける前に、詳細なリスクトレードオフ分析が必要です。';
  }

  return {
    finalScore,
    riskLevel,
    riskDetail,
    creditScore,
    propertyScore,
    interestRiskScore,
    currentDcsr,
    simulatedDcsr,
    simulatedRiskLevel,
    simulatedRiskDetail,
    simulatedRepayment,
    worstCaseVacancyDcsr,
    vacancyRiskLevel,
    vacancyRiskDetail,
    WORST_CASE_VACANCY_RATE,
  };
};

// ゲージメーターのグラフコンポーネント
const RiskGaugeChart = ({ score }) => {
  const totalScore = score.finalScore;

  const percentage = Math.round((totalScore / 100) * 100);
  const gaugeData = [{
    name: "リスクスコア",
    value: totalScore,
    fill: totalScore >= 80 ? "#22c55e" : totalScore >= 50 ? "#f97316" : "#ef4444",
    max: 100,
  }];

  return (
    <div className="w-full h-[300px] flex flex-col items-center p-4">
      <div className="text-xl font-bold mb-4 text-gray-700">総合リスクスコア (現状): {totalScore}点 / 100点</div>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="60%"
          innerRadius="70%"
          outerRadius="90%"
          barSize={40}
          data={gaugeData}
          startAngle={180}
          endAngle={0}
        >
          {/* ゲージの背景として機能する静的な円 */}
          <circle cx="50%" cy="60%" r="90" fill="#f3f4f6" stroke="none" />
          
          <RadialBar
            minAngle={15}
            endAngle={180 * (totalScore / 100) + 0} 
            dataKey="value"
            background={{ fill: '#eee' }}
            cornerRadius={10}
          />
          
          {/* スコアのテキスト表示 */}
          <text
            x="50%"
            y="60%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-4xl font-extrabold"
            fill={gaugeData[0].fill}
          >
            {percentage}%
          </text>
          <text
            x="50%"
            y="75%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-medium"
            fill="#4b5563"
          >
            {score.riskLevel}リスク
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 金利上昇シミュレーション結果コンポーネント
const InterestSimulationResult = ({ score, simulatedInterestRate }) => {
    return (
        <div className="p-4 border-2 border-dashed border-red-300 rounded-lg bg-red-50 shadow-md">
            <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
                金利上昇シミュレーション ({ (simulatedInterestRate * 100).toFixed(2) }% 適用時)
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between border-b pb-1">
                    <span className="font-medium">概算の年間総返済額 (シミュレーション後):</span>
                    <span className="font-bold text-red-600">¥{score.simulatedRepayment.toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex justify-between pb-1">
                    <span className="font-medium">シミュレーション後のDCSR:</span>
                    <span className="font-bold text-red-600">{score.simulatedDcsr.toFixed(2)}</span>
                </div>
                <p className={`mt-3 p-2 rounded text-center font-semibold 
                    ${score.simulatedRiskLevel === '低' ? 'bg-green-100 text-green-800' : 
                      score.simulatedRiskLevel === '中' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}
                >
                    リスク判定: {score.simulatedRiskLevel}
                </p>
                <p className="text-xs text-gray-500 italic mt-1">{score.simulatedRiskDetail}</p>
            </div>
        </div>
    );
};

// 空室率悪化シミュレーション結果コンポーネント
const VacancySimulationResult = ({ score }) => {
    return (
        <div className="p-4 border-2 border-dashed border-yellow-400 rounded-lg bg-yellow-50 shadow-md">
            <h3 className="text-lg font-bold text-yellow-700 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z"></path></svg>
                空室率悪化シミュレーション ({ (score.WORST_CASE_VACANCY_RATE * 100).toFixed(0) }% 想定)
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between pb-1">
                    <span className="font-medium">シミュレーション後のDCSR:</span>
                    <span className="font-bold text-yellow-600">{score.worstCaseVacancyDcsr.toFixed(2)}</span>
                </div>
                <p className={`mt-3 p-2 rounded text-center font-semibold 
                    ${score.vacancyRiskLevel === '低' ? 'bg-green-100 text-green-800' : 
                      score.vacancyRiskLevel === '中' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}
                >
                    リスク判定: {score.vacancyRiskLevel}
                </p>
                <p className="text-xs text-gray-500 italic mt-1">{score.vacancyRiskDetail}</p>
            </div>
        </div>
    );
};

const InputField = ({ label, name, value, onChange, placeholder, step = 1, min = 0, max = 9999999999 }) => (
  <div className="mb-4">
    <label className="block text-gray-700 text-sm font-medium mb-1">{label}</label>
    <input
      type="number"
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
    />
  </div>
);

function App() {
  const [input, setInput] = useState(initialInput);
  const [score, setScore] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    // 数値としてパースし、空欄の場合は0をセット
    const newValue = type === 'number' ? parseFloat(value) : value;

    setInput((prev) => ({
      ...prev,
      [name]: isNaN(newValue) ? 0 : newValue,
    }));
  };

  const handleCalculate = () => {
    const result = calculateRiskScore(input);
    setScore(result);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('ja-JP');
  };
  
  // 入力フィールドのデータ
  const fields = [
    { label: "主債務者の年収 (円)", name: "annualIncome", placeholder: "5,000,000", step: 100000 },
    { label: "年間の総返済額 (円) - 現状", name: "annualRepayment", placeholder: "1,000,000", step: 100000 },
    { label: "借入総額 (円)", name: "totalDebt", placeholder: "30,000,000", step: 1000000 },
    { label: "年間総家賃収入 (円)", name: "annualRentIncome", placeholder: "2,000,000", step: 100000 },
    { label: "年間経費率 (0.0 - 1.0)", name: "expenseRate", placeholder: "0.3", step: 0.01, max: 1 },
    { label: "想定空室率 (0.0 - 1.0) - 現状", name: "vacancyRate", placeholder: "0.1", step: 0.01, max: 1 },
    { label: "現在の金利 (0.0 - 1.0)", name: "interestRate", placeholder: "0.03", step: 0.001, max: 1 },
    { label: "他の負債の年収比 (0.0 - 1.0)", name: "otherDebtRatio", placeholder: "0.1", step: 0.01, max: 1 },
  ];

  const simulationField = { 
    label: "シミュレーション金利 (0.0 - 1.0)", 
    name: "simulatedInterestRate", 
    placeholder: "0.04", 
    step: 0.001, 
    max: 1 
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 font-inter">
      <div className="w-full max-w-3xl bg-white shadow-2xl rounded-xl p-8">
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-1">連帯保証リスク予測 Webアプリ</h1>
          <div className="w-24 h-1 bg-blue-500 mx-auto rounded"></div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 左カラム: 入力フォーム */}
          <div className="p-4 bg-blue-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3">不動産投資案件の詳細入力</h2>
            
            <div className="space-y-4">
              {fields.map(field => (
                <InputField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formatNumber(input[field.name])}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/,/g, '');
                    handleChange({ target: { name: field.name, value: rawValue, type: 'number' } });
                  }}
                  placeholder={field.placeholder}
                  step={field.step}
                  max={field.max}
                />
              ))}
              
              <div className="pt-2 border-t border-blue-200">
                <InputField
                    key={simulationField.name}
                    label={simulationField.label}
                    name={simulationField.name}
                    value={formatNumber(input[simulationField.name])}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '');
                      handleChange({ target: { name: simulationField.name, value: rawValue, type: 'number' } });
                    }}
                    placeholder={simulationField.placeholder}
                    step={simulationField.step}
                    max={simulationField.max}
                  />
              </div>
            </div>
            
            <button
              onClick={handleCalculate}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition duration-200 ease-in-out transform hover:scale-[1.01]"
            >
              リスクスコアを計算・シミュレーション
            </button>
          </div>

          {/* 右カラム: 結果表示 (グラフ化) */}
          <div className="p-4 bg-gray-100 rounded-lg shadow-inner flex flex-col justify-center items-center">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-l-4 border-blue-500 pl-3 w-full">リスク分析結果</h2>
            
            {score ? (
              <div className="w-full">
                <RiskGaugeChart score={score} />
                
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                    <h3 className="text-md font-semibold text-gray-800 mb-2">現状のリスク詳細</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li className="flex justify-between">
                        <span>主債務者信用力 (最大30点):</span>
                        <span className="font-bold text-blue-600">{score.creditScore}点</span>
                      </li>
                      <li className="flex justify-between">
                        <span>物件収益力 (最大40点):</span>
                        <span className="font-bold text-green-600">{score.propertyScore}点</span>
                      </li>
                      <li className="flex justify-between">
                        <span>金利変動リスク (最大30点):</span>
                        <span className="font-bold text-yellow-600">{score.interestRiskScore}点</span>
                      </li>
                      <li className="flex justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="font-medium">債務カバー率 (DCSR) - 現状:</span>
                        <span className="font-bold text-gray-800">{score.currentDcsr.toFixed(2)}</span>
                      </li>
                    </ul>
                    <p className={`mt-3 p-2 rounded text-center font-semibold text-sm
                        ${score.riskLevel === '低' ? 'bg-green-100 text-green-800' : 
                          score.riskLevel === '中' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                        >
                        現状リスク判定: {score.riskLevel}
                    </p>
                    <p className="mt-2 text-gray-600 text-xs max-w-lg">{score.riskDetail}</p>
                </div>
                
                {/* 2つのシミュレーション結果を並べて表示 */}
                <h3 className="text-xl font-bold text-gray-700 mt-8 mb-4 border-l-4 border-blue-500 pl-3 w-full">ワーストケース分析</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <InterestSimulationResult score={score} simulatedInterestRate={input.simulatedInterestRate} />
                    <VacancySimulationResult score={score} />
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l-2 2M15 19V6l2 2m-8 0h6m-6 4h6m-6 4h6"></path></svg>
                <p>入力値を設定し、「リスクスコアを計算」ボタンを押してください。結果がグラフとシミュレーションで表示されます。</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
