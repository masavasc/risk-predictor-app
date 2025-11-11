// risk-predictor-app/src/RiskCalculator.js

/**
 * 不動産投資案件の連帯保証リスクスコアを計算する関数
 * @param {object} data - 入力データオブジェクト
 * @param {number} [repaymentOverride] - シミュレーション用の年間返済額 (オプション)
 * @returns {object} - 計算結果と詳細を含むオブジェクト
 */
export function calculateRealEstateRisk(data, repaymentOverride) {
    const annualRepayment = repaymentOverride !== undefined ? repaymentOverride : data.annualRepayment;

    // 1. DSR (主債務者の個人経済状況) の計算
    let dsr;
    if (data.annualIncomeDebtor === 0.0) {
        return {
            score: 100,
            level: "致命的リスク: 主債務者の年収がゼロです。",
            dcrComment: "",
            dcrDetail: "",
            dcrValue: 0.0
        };
    } else {
        dsr = annualRepayment / data.annualIncomeDebtor;
    }
    let baseScore = Math.min(100, Math.floor(dsr * 150));

    // 2. DCR (物件の収益性) の計算
    let dcrComment = "";
    let dcrDetail = "";
    let dcr = 0.0;

    // 想定年間純収益 (NOI: Net Operating Income) の計算
    const grossIncomeAfterVacancy = data.annualRentalIncomeGross * (1.0 - data.vacancyRateAssumption);
    const annualNetIncome = grossIncomeAfterVacancy - (data.annualRentalIncomeGross * data.annualExpensesRatio);

    // 借入償還カバー率 (DCR: Debt Coverage Ratio) の計算
    if (annualRepayment > 0) {
        dcr = annualNetIncome / annualRepayment;
    } else {
        dcr = 999.0;
    }

    dcrComment = `【収益性指標】借入償還カバー率(DCR): ${dcr.toFixed(2)} (目標: 1.20以上)`;

    // DCRに基づいたリスクスコアの調整
    if (dcr < 1.0) {
        baseScore += 40;
        dcrDetail = "【🚨極めて高いリスク】収益で返済を賄えません。持ち出し必須。";
    } else if (dcr < 1.2) {
        baseScore += 15;
        dcrDetail = "【⚠️高いリスク】DCRがタイトです。キャッシュフローに余裕がありません。";
    } else {
        baseScore -= 10;
        dcrDetail = "【✅低いリスク】収益に一定の余裕があります。";
    }

    // 3. その他の負債による調整と最終スコア
    baseScore += Math.floor(data.otherDebtsRatio * 30);
    const finalScore = Math.max(0, Math.min(100, baseScore));

    // 4. 総合リスクレベルの評価
    let level;
    if (finalScore >= 70) {
        level = "非常に高いリスク (⚠️ 専門家への相談を強く推奨)";
    } else if (finalScore >= 50) {
        level = "高いリスク (注意深く検討が必要)";
    } else if (finalScore >= 30) {
        level = "中程度のリスク (詳細な情報確認を)";
    } else {
        level = "比較的低いリスク";
    }

    return {
        score: finalScore,
        level: level,
        dcrComment: dcrComment,
        dcrDetail: dcrDetail,
        dcrValue: dcr,
        annualNetIncome: annualNetIncome // 追加情報
    };
}


export function runWorstCaseSimulation(originalData, rateIncreasePercentage = 0.02, worstVacancyRate = 0.20) {
    // 1. 空室率悪化シミュレーション (20%に悪化)
    const simDataVacancy = { ...originalData, vacancyRateAssumption: worstVacancyRate };
    const resultVacancy = calculateRealEstateRisk(simDataVacancy);

    // 2. 金利上昇シミュレーション (2%上昇)
    const annualRepaymentIncrease = originalData.loanAmount * rateIncreasePercentage;
    const newAnnualRepayment = originalData.annualRepayment + annualRepaymentIncrease;

    const resultRate = calculateRealEstateRisk(originalData, newAnnualRepayment);

    return {
        original: calculateRealEstateRisk(originalData),
        vacancy: resultVacancy,
        rateHike: resultRate,
        newRepaymentAmount: newAnnualRepayment
    };
}