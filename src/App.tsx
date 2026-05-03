/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Calculator as CalcIcon, 
  TrendingUp, 
  DollarSign, 
  Home, 
  Percent, 
  Info, 
  ArrowRight,
  PieChart as PieChartIcon,
  ChevronRight,
  AlertCircle,
  Coins
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend 
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// --- Constants & Types ---

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface CalculationResult {
  bidPrice: number;
  acquisitionTax: number;
  legalFees: number;
  repairCosts: number;
  totalAcquisitionCost: number;
  loanAmount: number;
  equityNeeded: number;
  monthlyInterest: number;
  totalInterest: number;
  expectedResalePrice: number;
  totalProfit: number;
  roi: number;
  breakEvenPrice: number;
}

// --- Helper Components ---

const NumericInput = ({ 
  label, 
  value, 
  onChange, 
  suffix = "원", 
  description,
  isPercentage = false
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void; 
  suffix?: string;
  description?: string;
  isPercentage?: boolean;
}) => {
  const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (isPercentage) return val.toFixed(1);
    return new Intl.NumberFormat('ko-KR').format(val);
  };

  const [inputValue, setInputValue] = React.useState(formatValue(value));
  const isFocused = React.useRef(false);

  React.useEffect(() => {
    if (!isFocused.current) {
      setInputValue(formatValue(value));
    }
  }, [value, isPercentage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, "");
    setInputValue(rawValue);

    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      if (isPercentage) {
        onChange(Math.min(100, numValue));
      } else {
        onChange(numValue);
      }
    } else if (rawValue === "") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    setInputValue(formatValue(value));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    e.target.select();
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {description}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className="pr-12 font-mono h-10 transition-shadow focus:ring-2 focus:ring-blue-100"
          placeholder={isPercentage ? "0.0" : "0"}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
          {suffix}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 text-right font-medium">
        {isNaN(value) ? `0 ${suffix}` : (isPercentage ? `${value.toFixed(1)}%` : `${new Intl.NumberFormat('ko-KR').format(value)} ${suffix}`)}
      </div>
    </div>
  );
};

const ResultItem = ({ label, value, suffix = "원", highlight = false, subValue }: { label: string; value: string | number; suffix?: string; highlight?: boolean; subValue?: string }) => (
  <div className={cn(
    "flex justify-between items-center p-3 rounded-lg transition-colors",
    highlight ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50"
  )}>
    <span className="text-sm text-slate-600">{label}</span>
    <div className="text-right">
      <div className={cn(
        "font-bold",
        highlight ? "text-blue-600 text-lg" : "text-slate-900"
      )}>
        {typeof value === 'number' ? new Intl.NumberFormat('ko-KR').format(value) : value}{suffix}
      </div>
      {subValue && <div className="text-[10px] text-slate-400">{subValue}</div>}
    </div>
  </div>
);

// --- Main Application ---

type PropertyType = "RESIDENTIAL" | "NON_RESIDENTIAL" | "FARMLAND";
type RegionType = "NORMAL" | "ADJUSTED";
type HouseCount = 1 | 2 | 3 | 4;

export default function App() {
  // Inputs
  const [appraisalValue, setAppraisalValue] = useState(500000000); // 5억
  const [minBidPrice, setMinBidPrice] = useState(400000000); // 4억
  const [bidPrice, setBidPrice] = useState(450000000); // 4.5억
  const [loanRatio, setLoanRatio] = useState(70); // 70%
  const [interestRate, setInterestRate] = useState(4.5); // 4.5%
  const [taxRate, setTaxRate] = useState(1.1); // 1.1% (취득세)
  const [legalFeeRate, setLegalFeeRate] = useState(0.5); // 0.5% (법무비용)
  const [repairCosts, setRepairCosts] = useState(10000000); // 1000만
  const [expectedResalePrice, setExpectedResalePrice] = useState(550000000); // 5.5억
  const [holdingPeriod, setHoldingPeriod] = useState(12); // 12개월
  const [propertyType, setPropertyType] = useState<PropertyType>("RESIDENTIAL");
  const [houseCount, setHouseCount] = useState<HouseCount>(1);
  const [regionType, setRegionType] = useState<RegionType>("NORMAL");
  const [isAutoTax, setIsAutoTax] = useState(true);

  // Automatic Tax Calculation Logic (2026 Table)
  const applyAutoTax = React.useCallback((type: PropertyType, price: number, houses: HouseCount, region: RegionType) => {
    let tRate = 1.1;
    let lRate = 0.5;

    if (type === "RESIDENTIAL") {
      lRate = 0.3;
      
      // Determine base tax rate based on house count and region
      if (houses === 1 || (houses === 2 && region === "NORMAL")) {
        // Standard Tax (1% ~ 3%)
        if (price <= 600000000) tRate = 1.0;
        else if (price <= 900000000) {
          tRate = (price * 2 / 300000000) - 3;
        } else {
          tRate = 3.0;
        }
        // Add approx 0.1% ~ 0.5% for education/etc (simplified to average 0.1% or 0.3%)
        tRate += (price > 600000000 ? 0.3 : 0.1); 
      } 
      else if ((houses === 2 && region === "ADJUSTED") || (houses === 3 && region === "NORMAL")) {
        tRate = 8.4; // 8% base + approx 0.4% surcharge
      } 
      else if ((houses === 3 && region === "ADJUSTED") || houses >= 4) {
        tRate = 12.4; // 12% base + approx 0.4% surcharge
      }
    } else if (type === "NON_RESIDENTIAL") {
      tRate = 4.6; 
      lRate = 0.5;
    } else if (type === "FARMLAND") {
      tRate = 3.4;
      lRate = 0.4;
    }

    setTaxRate(Number(Math.max(0, tRate).toFixed(2)));
    setLegalFeeRate(lRate);
  }, []);

  // Sync tax rates when any relevant value changes if auto is enabled
  React.useEffect(() => {
    if (isAutoTax) {
      applyAutoTax(propertyType, bidPrice, houseCount, regionType);
    }
  }, [bidPrice, propertyType, houseCount, regionType, isAutoTax, applyAutoTax]);

  // Calculations
  const results = useMemo((): CalculationResult => {
    const acquisitionTax = Math.floor(bidPrice * (taxRate / 100));
    const legalFees = Math.floor(bidPrice * (legalFeeRate / 100));
    const totalAcquisitionCost = bidPrice + acquisitionTax + legalFees + repairCosts;
    
    const loanAmount = Math.floor(bidPrice * (loanRatio / 100));
    const equityNeeded = totalAcquisitionCost - loanAmount;
    
    const monthlyInterest = Math.floor((loanAmount * (interestRate / 100)) / 12);
    const totalInterest = monthlyInterest * holdingPeriod;
    
    const totalProfit = expectedResalePrice - totalAcquisitionCost - totalInterest;
    const roi = equityNeeded > 0 ? (totalProfit / equityNeeded) * 100 : 0;
    
    const breakEvenPrice = totalAcquisitionCost + totalInterest;

    return {
      bidPrice,
      acquisitionTax,
      legalFees,
      repairCosts,
      totalAcquisitionCost,
      loanAmount,
      equityNeeded,
      monthlyInterest,
      totalInterest,
      expectedResalePrice,
      totalProfit,
      roi,
      breakEvenPrice
    };
  }, [bidPrice, loanRatio, interestRate, taxRate, legalFeeRate, repairCosts, expectedResalePrice, holdingPeriod]);

  const chartData = useMemo(() => [
    { name: "낙찰가", value: results.bidPrice },
    { name: "취득세", value: results.acquisitionTax },
    { name: "법무비용", value: results.legalFees },
    { name: "수리/명도", value: results.repairCosts },
    { name: "이자비용", value: results.totalInterest },
  ], [results]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              <CalcIcon className="w-3 h-3" />
              Auction Analysis
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              부동산 경매 <span className="text-blue-600">투자분석</span> 계산기
            </h1>
            <p className="text-slate-500 max-w-2xl">
              낙찰가부터 대출 이자, 세금, 수리비까지 고려한 정밀한 수익률 시뮬레이션을 제공합니다.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">예상 수익률</div>
              <div className={cn(
                "text-3xl font-black",
                results.roi >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {results.roi.toFixed(2)}%
              </div>
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              results.roi >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  투자 조건 입력
                </CardTitle>
                <CardDescription className="text-slate-400">
                  물건 정보와 예상 비용을 입력하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-500" />
                    물건 종류 및 취득 조건
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "RESIDENTIAL", label: "주택" },
                      { id: "NON_RESIDENTIAL", label: "상가/토지" },
                      { id: "FARMLAND", label: "농지" }
                    ].map((type) => (
                      <Button
                        key={`property-type-${type.id}`}
                        variant={propertyType === type.id ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] px-1 h-8"
                        onClick={() => {
                          setPropertyType(type.id as PropertyType);
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>

                  {propertyType === "RESIDENTIAL" && (
                    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">보유 주택 수 (취득 물건 포함)</Label>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((count) => (
                            <Button
                              key={`house-count-${count}`}
                              variant={houseCount === count ? "default" : "outline"}
                              size="sm"
                              className="h-7 text-[10px]"
                              onClick={() => setHouseCount(count as HouseCount)}
                            >
                              {count === 4 ? "4주택+" : `${count}주택`}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">지역 구분</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            variant={regionType === "NORMAL" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => setRegionType("NORMAL")}
                          >
                            비조정대상지역
                          </Button>
                          <Button
                            variant={regionType === "ADJUSTED" ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => setRegionType("ADJUSTED")}
                          >
                            조정대상지역
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    variant={isAutoTax ? "default" : "outline"} 
                    size="sm" 
                    className={cn(
                      "w-full text-[10px] h-7",
                      isAutoTax ? "bg-blue-600 text-white" : "text-slate-400"
                    )}
                    onClick={() => setIsAutoTax(!isAutoTax)}
                  >
                    {isAutoTax ? "법정 세율 자동 적용 중" : "수동 입력 모드 (클릭하여 자동 적용)"}
                  </Button>
                </div>

                <Separator />

                <NumericInput 
                  label="감정가" 
                  value={appraisalValue} 
                  onChange={setAppraisalValue} 
                  description="법원에서 평가한 물건의 가치입니다."
                />
                <NumericInput 
                  label="최저매각가격" 
                  value={minBidPrice} 
                  onChange={setMinBidPrice} 
                  description="이번 회차에서 입찰 가능한 최소 금액입니다."
                />
                <Separator />
                <NumericInput 
                  label="예상 낙찰가" 
                  value={bidPrice} 
                  onChange={setBidPrice} 
                  description="본인이 입찰하고자 하는 금액입니다."
                />
                
                <NumericInput 
                  label="대출 비율 (LTV)" 
                  value={loanRatio} 
                  onChange={setLoanRatio} 
                  suffix="%" 
                  isPercentage
                />

                <div className="grid grid-cols-2 gap-4">
                  <NumericInput 
                    label="대출 이자율" 
                    value={interestRate} 
                    onChange={setInterestRate} 
                    suffix="%" 
                    isPercentage
                  />
                  <NumericInput 
                    label="보유 기간" 
                    value={holdingPeriod} 
                    onChange={setHoldingPeriod} 
                    suffix="개월" 
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <NumericInput 
                    label="취득세율" 
                    value={taxRate} 
                    onChange={setTaxRate} 
                    suffix="%" 
                    isPercentage
                  />
                  <NumericInput 
                    label="법무/기타" 
                    value={legalFeeRate} 
                    onChange={setLegalFeeRate} 
                    suffix="%" 
                    isPercentage
                  />
                </div>
                
                <NumericInput 
                  label="명도/수리비" 
                  value={repairCosts} 
                  onChange={setRepairCosts} 
                />
                
                <Separator />
                
                <NumericInput 
                  label="예상 매도가" 
                  value={expectedResalePrice} 
                  onChange={setExpectedResalePrice} 
                  description="보유 기간 후 매도할 때의 예상 가격입니다."
                />
                <Separator />
                
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5" />
                    2026 취득세율 정보
                  </div>
                  
                  <div className="overflow-hidden rounded-xl border border-slate-100 text-[10px]">
                    <div className="grid grid-cols-3 bg-slate-100 p-2 font-bold text-slate-600 border-b border-slate-100">
                      <div>구분</div>
                      <div className="text-center">비조정지역</div>
                      <div className="text-center">조정지역</div>
                    </div>
                    <div className="grid grid-cols-3 p-2 border-b border-slate-50 bg-white items-center">
                      <div className="font-medium">1주택</div>
                      <div className="text-center text-blue-600">1~3%</div>
                      <div className="text-center text-blue-600">1~3%</div>
                    </div>
                    <div className="grid grid-cols-3 p-2 border-b border-slate-50 bg-white items-center">
                      <div className="font-medium">2주택</div>
                      <div className="text-center">1~3%</div>
                      <div className="text-center text-red-500 font-bold">8% (중과)</div>
                    </div>
                    <div className="grid grid-cols-3 p-2 border-b border-slate-50 bg-white items-center">
                      <div className="font-medium">3주택</div>
                      <div className="text-center text-red-500 font-bold">8%</div>
                      <div className="text-center text-red-500 font-black italic">12%</div>
                    </div>
                    <div className="grid grid-cols-3 p-2 bg-white items-center">
                      <div className="font-medium">4주택+ / 법인</div>
                      <div className="text-center text-red-500 font-black">12%</div>
                      <div className="text-center text-red-500 font-black">12%</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      📌 <span className="font-bold">기타 부동산:</span> 상가/토지/오피스텔 <span className="text-slate-800 font-bold">4.6%</span>, 농지 <span className="text-slate-800 font-bold">3.4%</span> (고정세율)
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      📌 <span className="font-bold">기본세율(1~3%) 구간:</span> 6억 이하(1%), 6~9억(비례계산), 9억 초과(3%)
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 p-4 border-t">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertCircle className="w-4 h-4" />
                  실제 세금 및 대출 조건은 개인별로 다를 수 있습니다.
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right: Analysis */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Home className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">총 취득 비용</span>
                  </div>
                  <div className="text-xl font-bold">
                    {new Intl.NumberFormat('ko-KR').format(results.totalAcquisitionCost)}원
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">필요 실투자금</span>
                  </div>
                  <div className="text-xl font-bold">
                    {new Intl.NumberFormat('ko-KR').format(results.equityNeeded)}원
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1" title="KRW">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">예상 순이익</span>
                  </div>
                  <div className={cn(
                    "text-xl font-bold",
                    results.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {new Intl.NumberFormat('ko-KR').format(results.totalProfit)}원
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Detailed Reports */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-500" />
                    취득 및 금융 비용 상세
                  </h3>
                  <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex flex-col gap-1">
                    <ResultItem label="낙찰가" value={results.bidPrice} />
                    <ResultItem label="취득세" value={results.acquisitionTax} subValue={`${taxRate}% 적용`} />
                    <ResultItem label="금융(이자)" value={results.totalInterest} subValue={`${holdingPeriod}개월`} />
                    <ResultItem label="수리/명도" value={results.repairCosts} />
                    <Separator className="my-1" />
                    <ResultItem label="총 취득가" value={results.totalAcquisitionCost} highlight />
                    <ResultItem label="실투자금" value={results.equityNeeded} subValue="자기자본" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-blue-500" />
                    수익성 분석 시각화
                  </h3>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">예상 매도가</div>
                        <div className="text-xl font-black">{new Intl.NumberFormat('ko-KR').format(results.expectedResalePrice)}원</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">손익분기</div>
                        <div className="text-xs font-medium text-slate-600">{new Intl.NumberFormat('ko-KR').format(results.breakEvenPrice)}원</div>
                      </div>
                    </div>
                    
                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (results.totalAcquisitionCost / results.expectedResalePrice) * 100)}%` }}
                      />
                      <div 
                        className="absolute top-0 left-0 h-full bg-amber-400 transition-all duration-500"
                        style={{ 
                          left: `${(results.totalAcquisitionCost / results.expectedResalePrice) * 100}%`,
                          width: `${Math.min(100 - (results.totalAcquisitionCost / results.expectedResalePrice) * 100, (results.totalInterest / results.expectedResalePrice) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>취득원가</span>
                      <span>이자비용</span>
                      <span>수익구간</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">최종 예상 수익</div>
                        <div className={cn(
                          "text-xl font-black",
                          results.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {new Intl.NumberFormat('ko-KR').format(results.totalProfit)}원
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">수익률 (ROI)</div>
                        <div className={cn(
                          "text-lg font-black",
                          results.roi >= 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {results.roi.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualization Column */}
              <div className="space-y-4">
                <Card className="bg-white border-none shadow-sm overflow-hidden h-full flex flex-col">
                  <CardHeader className="py-4">
                    <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-blue-500" />
                      비용 구조 시각화
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center min-h-[250px] p-2">
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`pie-cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                      {chartData.slice(0, 4).map((item, idx) => {
                        const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                        const percentage = ((item.value / total) * 100).toFixed(1);
                        return (
                          <div key={`cost-detail-${item.name}`} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-medium">
                              <span>{item.name}</span>
                              <span className="text-slate-400">{percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: COLORS[idx % COLORS.length] 
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Investment Opinion - Now at the Bottom */}
            <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <CalcIcon className="w-32 h-32" />
              </div>
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base">AI 투자 의견</CardTitle>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
                    {results.roi > 20 
                      ? "매우 매력적인 수익률입니다. 명도 리스크와 급매가격을 다시 한번 확인 후 입찰을 권장합니다."
                      : results.roi > 10 
                      ? "안정적인 수익권입니다. 인근 유사 물건의 최근 낙찰가율을 분석하여 경쟁력을 확보하세요."
                      : results.roi > 0 
                      ? "수익이 낮거나 리스크 대비 보상이 적을 수 있습니다. 비용 절감 방안이나 매도가 상향 가능성을 검토하세요."
                      : "현재 조건으로는 손실이 예상됩니다. 입찰가를 낮추거나 다른 물건을 검토하는 것이 좋습니다."}
                  </p>
                </div>
                <div className="p-6 md:border-l md:border-slate-800 w-full md:w-auto">
                  <Button variant="default" className="w-full bg-blue-600 hover:bg-blue-500 font-bold whitespace-nowrap">
                    상세 리포트 PDF 저장
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

        </div>
        
        {/* Footer */}
        <footer className="pt-12 pb-8 text-center border-t border-slate-200">
          <p className="text-sm text-slate-400">
            © 2026 부동산 경매 투자분석 시스템. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center gap-6 text-xs font-medium text-slate-500">
            <a href="#" className="hover:text-blue-600 transition-colors">이용약관</a>
            <a href="#" className="hover:text-blue-600 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-blue-600 transition-colors">고객지원</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
