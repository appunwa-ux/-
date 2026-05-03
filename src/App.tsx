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
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  withSlider = false,
  min = 0,
  max = 1000000000,
  step = 1000000,
  isPercentage = false
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void; 
  suffix?: string;
  description?: string;
  withSlider?: boolean;
  min?: number;
  max?: number;
  step?: number;
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
    // Only sync from parent if not focused (to allow external updates like auto-tax)
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

  const valueToNumber = (val: number) => {
    if (isNaN(val)) return 0;
    return val;
  };

  const sliderValue = valueToNumber(value);
  const sliderMax = valueToNumber(max);
  const sliderMin = valueToNumber(min);

  const handleSliderChange = (vals: number[]) => {
    const val = vals[0];
    if (!isNaN(val)) {
      onChange(val);
    }
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
          className="pr-12 font-mono"
          placeholder={isPercentage ? "0.0" : "0"}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
          {suffix}
        </span>
      </div>
      <div className="pt-2 pb-1">
        <Slider 
          value={[sliderValue]} 
          onValueChange={handleSliderChange} 
          min={sliderMin}
          max={sliderMax} 
          step={step} 
          className="[&_[data-slot=slider-range]]:bg-blue-300"
        />
      </div>
      <div className="text-[10px] text-slate-500 text-right">
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

type PropertyType = "RESIDENTIAL_1ST" | "RESIDENTIAL_MULTI" | "NON_RESIDENTIAL";

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
  const [propertyType, setPropertyType] = useState<PropertyType>("RESIDENTIAL_1ST");
  const [isAutoTax, setIsAutoTax] = useState(true);

  // Define stable max for sliders
  const stableMax = React.useMemo(() => {
    // Round up to nearest 1억 or use constant if too small
    const base = appraisalValue > 0 ? appraisalValue : 500000000;
    return Math.max(base * 3, 1000000000); 
  }, [appraisalValue > 0 ? Math.floor(appraisalValue / 100000000) : 0]); 
  // Note: deps logic updated to only change when appraisalValue cross 1억 boundaries to reduce jumping

  const priceStep = React.useMemo(() => 100000, []);

  // Automatic Tax Calculation Logic
  const applyAutoTax = React.useCallback((type: PropertyType, price: number) => {
    let tRate = 1.1;
    let lRate = 0.5;

    if (type === "RESIDENTIAL_1ST") {
      if (price <= 600000000) tRate = 1.1;
      else if (price <= 900000000) {
        tRate = Number(((price * 2 / 300000000 - 3)).toFixed(2));
      }
      else tRate = 3.3;
      lRate = 0.3;
    } else if (type === "RESIDENTIAL_MULTI") {
      tRate = 8.8; 
      lRate = 0.4;
    } else if (type === "NON_RESIDENTIAL") {
      tRate = 4.6; 
      lRate = 0.5;
    }

    setTaxRate(Math.max(0, tRate));
    setLegalFeeRate(lRate);
  }, []);

  // Sync tax rates when bidPrice or type changes if auto is enabled
  React.useEffect(() => {
    if (isAutoTax) {
      applyAutoTax(propertyType, bidPrice);
    }
  }, [bidPrice, propertyType, isAutoTax, applyAutoTax]);

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

  const chartData = [
    { name: "낙찰가", value: results.bidPrice },
    { name: "취득세", value: results.acquisitionTax },
    { name: "법무비용", value: results.legalFees },
    { name: "수리/명도", value: results.repairCosts },
    { name: "이자비용", value: results.totalInterest },
  ];

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
                      { id: "RESIDENTIAL_1ST", label: "주택(1주택)" },
                      { id: "RESIDENTIAL_MULTI", label: "주택(다주택)" },
                      { id: "NON_RESIDENTIAL", label: "상가/토지" }
                    ].map((type) => (
                      <Button
                        key={type.id}
                        variant={propertyType === type.id ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] px-1 h-8"
                        onClick={() => {
                          setPropertyType(type.id as PropertyType);
                          applyAutoTax(type.id as PropertyType, bidPrice);
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
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
                  max={stableMax}
                  step={priceStep}
                />
                <NumericInput 
                  label="최저매각가격" 
                  value={minBidPrice} 
                  onChange={setMinBidPrice} 
                  description="이번 회차에서 입찰 가능한 최소 금액입니다."
                  max={stableMax}
                  step={priceStep}
                />
                <Separator />
                <NumericInput 
                  label="예상 낙찰가" 
                  value={bidPrice} 
                  onChange={setBidPrice} 
                  description="본인이 입찰하고자 하는 금액입니다."
                  max={stableMax}
                  step={priceStep}
                />
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">대출 비율 (LTV)</Label>
                    <span className="text-blue-600 font-bold">{isNaN(loanRatio) ? 0 : loanRatio}%</span>
                  </div>
                  <Slider 
                    value={[isNaN(loanRatio) ? 0 : loanRatio]} 
                    onValueChange={(v) => !isNaN(v[0]) && setLoanRatio(v[0])} 
                    max={90} 
                    step={5} 
                    className="[&_[data-slot=slider-range]]:bg-blue-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <NumericInput 
                    label="대출 이자율" 
                    value={interestRate} 
                    onChange={setInterestRate} 
                    suffix="%" 
                    isPercentage
                    max={15}
                    step={0.1}
                  />
                  <NumericInput 
                    label="보유 기간" 
                    value={holdingPeriod} 
                    onChange={setHoldingPeriod} 
                    suffix="개월" 
                    max={36}
                    step={1}
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
                    max={15}
                    step={0.1}
                  />
                  <NumericInput 
                    label="법무/기타" 
                    value={legalFeeRate} 
                    onChange={setLegalFeeRate} 
                    suffix="%" 
                    isPercentage
                    max={5}
                    step={0.1}
                  />
                </div>
                
                <NumericInput 
                  label="명도/수리비" 
                  value={repairCosts} 
                  onChange={setRepairCosts} 
                  max={100000000}
                  step={1000000}
                />
                
                <Separator />
                
                <NumericInput 
                  label="예상 매도가" 
                  value={expectedResalePrice} 
                  onChange={setExpectedResalePrice} 
                  description="보유 기간 후 매도할 때의 예상 가격입니다."
                  max={stableMax}
                  step={priceStep}
                />
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
          <div className="lg:col-span-8 space-y-8">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Home className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">총 취득 비용</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('ko-KR').format(results.totalAcquisitionCost)}원
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">필요 실투자금</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('ko-KR').format(results.equityNeeded)}원
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-500">예상 순이익</span>
                  </div>
                  <div className={cn(
                    "text-2xl font-bold",
                    results.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {new Intl.NumberFormat('ko-KR').format(results.totalProfit)}원
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-200/50 p-1 rounded-xl">
                <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  상세 분석 리포트
                </TabsTrigger>
                <TabsTrigger value="charts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  비용 구조 시각화
                </TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <TabsContent value="summary">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                          취득 및 부대비용
                        </h3>
                        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
                          <ResultItem label="낙찰가" value={results.bidPrice} />
                          <ResultItem label="취득세" value={results.acquisitionTax} subValue={`${taxRate}% 적용`} />
                          <ResultItem label="법무 및 기타비용" value={results.legalFees} subValue={`${legalFeeRate}% 적용`} />
                          <ResultItem label="명도 및 수리비" value={results.repairCosts} />
                          <Separator className="my-2" />
                          <ResultItem label="총 취득가액" value={results.totalAcquisitionCost} highlight />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                          금융 비용 (대출)
                        </h3>
                        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
                          <ResultItem label="대출 금액" value={results.loanAmount} subValue={`낙찰가의 ${loanRatio}%`} />
                          <ResultItem label="월 이자 비용" value={results.monthlyInterest} subValue={`연 ${interestRate}%`} />
                          <ResultItem label="총 이자 비용" value={results.totalInterest} subValue={`${holdingPeriod}개월 보유 기준`} />
                          <Separator className="my-2" />
                          <ResultItem label="실투자금 (자기자본)" value={results.equityNeeded} highlight />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                          수익성 분석
                        </h3>
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-xs text-slate-400 font-bold">예상 매도가</div>
                              <div className="text-2xl font-black">{new Intl.NumberFormat('ko-KR').format(results.expectedResalePrice)}원</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400 font-bold">손익분기점</div>
                              <div className="text-sm font-medium text-slate-600">{new Intl.NumberFormat('ko-KR').format(results.breakEvenPrice)}원</div>
                            </div>
                          </div>
                          
                          <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
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
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                            <span>취득원가</span>
                            <span>이자비용</span>
                            <span>수익구간</span>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">최종 예상 수익</span>
                              <span className={cn(
                                "text-2xl font-black",
                                results.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                              )}>
                                {new Intl.NumberFormat('ko-KR').format(results.totalProfit)}원
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">자기자본 수익률 (ROI)</span>
                              <span className={cn(
                                "text-xl font-black",
                                results.roi >= 0 ? "text-emerald-600" : "text-red-600"
                              )}>
                                {results.roi.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Card className="bg-blue-600 text-white border-none shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                          <CalcIcon className="w-24 h-24" />
                        </div>
                        <CardHeader>
                          <CardTitle className="text-lg">투자 의견</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-blue-100 text-sm leading-relaxed">
                            {results.roi > 20 
                              ? "매우 매력적인 수익률입니다. 명도 리스크와 급매가격을 다시 한번 확인 후 입찰을 권장합니다."
                              : results.roi > 10 
                              ? "안정적인 수익권입니다. 인근 유사 물건의 최근 낙찰가율을 분석하여 경쟁력을 확보하세요."
                              : results.roi > 0 
                              ? "수익이 낮거나 리스크 대비 보상이 적을 수 있습니다. 비용 절감 방안이나 매도가 상향 가능성을 검토하세요."
                              : "현재 조건으로는 손실이 예상됩니다. 입찰가를 낮추거나 다른 물건을 검토하는 것이 좋습니다."}
                          </p>
                        </CardContent>
                        <CardFooter>
                          <Button variant="secondary" className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold">
                            리포트 PDF 저장하기
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </motion.div>
                </TabsContent>

                <TabsContent value="charts">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <Card className="bg-white border-none shadow-sm h-[400px]">
                      <CardHeader>
                        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <PieChartIcon className="w-4 h-4 text-blue-500" />
                          총 지출 구조
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-full pb-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">비용 상세 비중</h3>
                      <div className="space-y-3">
                        {chartData.map((item, idx) => {
                          const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                          const percentage = ((item.value / total) * 100).toFixed(1);
                          return (
                            <div key={item.name} className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span>{item.name}</span>
                                <span className="text-slate-400">{percentage}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-8 p-4 bg-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed">
                        <div className="font-bold mb-1 text-slate-700">분석 가이드:</div>
                        낙찰가가 전체 비용의 대부분을 차지하지만, 취득세와 이자비용 또한 무시할 수 없는 수준입니다. 
                        특히 보유 기간이 길어질수록 이자비용 비중이 높아지므로 빠른 명도와 매도가 중요합니다.
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
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
