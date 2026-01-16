// @ts-nocheck
import { useState, useEffect } from "react";

interface SynonymMapping {
  id: string;
  category: string;
  primary_key: string;
  synonyms: string[];
  description: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ProductCategory {
  depth2: string;
  jobType: string | null;
  loanType: string;
  count: number;
}

export function AdminProductMappings() {
  const [mappings, setMappings] = useState<SynonymMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "synonyms" | "categories">("overview");
  const [dataSource, setDataSource] = useState<string>("unknown");

  // 추가/수정 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SynonymMapping | null>(null);
  const [formData, setFormData] = useState({
    category: "직업",
    primary_key: "",
    synonyms: "",
    description: "",
    priority: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 상품 분류 데이터
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    jobTypeCount: 0,
    loanTypeCount: 0,
    synonymGroupCount: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 동의어 매핑 조회
      const synonymsRes = await fetch("/api/admin/synonyms");
      if (synonymsRes.ok) {
        const data = await synonymsRes.json();
        setMappings(data.mappings || []);
        setDataSource(data.source || "unknown");
      }

      // 상품 분류 정보 조회
      const mappingsRes = await fetch("/api/admin/product-mappings");
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setStats(data.stats || {});
        setProductCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingMapping(null);
    setFormData({
      category: "직업",
      primary_key: "",
      synonyms: "",
      description: "",
      priority: 0,
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (mapping: SynonymMapping) => {
    setEditingMapping(mapping);
    setFormData({
      category: mapping.category,
      primary_key: mapping.primary_key,
      synonyms: mapping.synonyms.join(", "),
      description: mapping.description || "",
      priority: mapping.priority,
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.primary_key.trim()) {
      setError("키워드를 입력하세요");
      return;
    }
    if (!formData.synonyms.trim()) {
      setError("동의어를 입력하세요");
      return;
    }

    setSaving(true);
    setError(null);

    const synonymsArray = formData.synonyms
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const url = editingMapping
        ? `/api/admin/synonyms/${editingMapping.id}`
        : "/api/admin/synonyms";
      const method = editingMapping ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.category,
          primary_key: formData.primary_key.trim(),
          synonyms: synonymsArray,
          description: formData.description.trim() || null,
          priority: formData.priority,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다");
        return;
      }

      setShowModal(false);
      fetchData(); // 데이터 새로고침
    } catch (err) {
      setError("서버 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mapping: SynonymMapping) => {
    if (!confirm(`"${mapping.primary_key}" 동의어를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/synonyms/${mapping.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다");
      }
    } catch (err) {
      alert("서버 오류가 발생했습니다");
    }
  };

  const handleToggleActive = async (mapping: SynonymMapping) => {
    try {
      const res = await fetch(`/api/admin/synonyms/${mapping.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !mapping.is_active }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const categories = ["직업", "대출유형", "조건", "특수"];
  const categoryIcons: Record<string, string> = {
    직업: "👔",
    대출유형: "💰",
    조건: "📋",
    특수: "⭐",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">상품 분류 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            검색 필터링 매핑 및 동의어 관리
            {dataSource === "database" && (
              <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs">
                DB 연동
              </span>
            )}
            {dataSource === "default" && (
              <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-xs">
                기본값 사용
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab("synonyms")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "synonyms"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            동의어 매핑
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            상품 분류
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-primary">{stats.totalProducts || 163}</div>
            <div className="text-sm text-muted-foreground mt-1">전체 상품</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-blue-500">{stats.jobTypeCount || 8}</div>
            <div className="text-sm text-muted-foreground mt-1">직업 유형</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-green-500">{stats.loanTypeCount || 6}</div>
            <div className="text-sm text-muted-foreground mt-1">대출 유형</div>
          </div>
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <div className="text-3xl font-bold text-purple-500">{mappings.length}</div>
            <div className="text-sm text-muted-foreground mt-1">동의어 그룹</div>
          </div>

          {/* 직업 유형별 분포 */}
          <div className="col-span-full bg-card rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold mb-4">직업 유형별 상품 분포</h3>
            <div className="space-y-3">
              {mappings
                .filter((m) => m.category === "직업" && m.is_active)
                .map((mapping) => {
                  const count = productCategories
                    .filter((c) => c.jobType === mapping.primary_key)
                    .reduce((sum, c) => sum + c.count, 0);
                  const maxCount = 49;
                  return (
                    <div key={mapping.id} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{mapping.primary_key}</div>
                      <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${Math.min((count / maxCount) * 100, 100)}%`, minWidth: count > 0 ? "30px" : "0" }}
                        >
                          {count > 0 && (
                            <span className="text-xs text-primary-foreground font-medium">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-40 text-xs text-muted-foreground truncate">
                        {mapping.description || mapping.synonyms.slice(0, 2).join(", ")}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Synonyms Tab */}
      {activeTab === "synonyms" && (
        <div className="space-y-4">
          {/* 추가 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 동의어 추가
            </button>
          </div>

          {categories.map((category) => {
            const categoryMappings = mappings.filter((m) => m.category === category);
            if (categoryMappings.length === 0) return null;

            return (
              <div key={category} className="bg-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                  <span>{categoryIcons[category]}</span>
                  {category} 동의어
                  <span className="text-sm font-normal text-muted-foreground">
                    ({categoryMappings.length}개)
                  </span>
                </h3>
                <div className="space-y-3">
                  {categoryMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className={`flex flex-wrap items-center gap-2 p-3 rounded-lg transition-colors ${
                        mapping.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                      }`}
                    >
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          mapping.is_active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mapping.primary_key}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex flex-wrap gap-1 flex-1">
                        {mapping.synonyms.map((syn) => (
                          <span
                            key={syn}
                            className="px-2 py-1 bg-background border border-border rounded text-sm"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleToggleActive(mapping)}
                          className={`p-1.5 rounded hover:bg-muted ${
                            mapping.is_active ? "text-green-500" : "text-muted-foreground"
                          }`}
                          title={mapping.is_active ? "비활성화" : "활성화"}
                        >
                          {mapping.is_active ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(mapping)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="수정"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(mapping)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                          title="삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">상품 유형 (depth2)</th>
                <th className="text-left p-4 font-medium">직업 타입</th>
                <th className="text-left p-4 font-medium">대출 유형</th>
                <th className="text-center p-4 font-medium">상품 수</th>
                <th className="text-left p-4 font-medium">검색 키워드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {productCategories.map((cat, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="p-4 font-medium">{cat.depth2}</td>
                  <td className="p-4">
                    {cat.jobType ? (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs">
                        {cat.jobType}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
                      {cat.loanType}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono">{cat.count}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {cat.jobType &&
                        mappings
                          .find((m) => m.primary_key === cat.jobType)
                          ?.synonyms.slice(0, 3)
                          .map((s) => (
                            <span key={s} className="text-xs text-muted-foreground">
                              {s}
                            </span>
                          ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md mx-4 border border-border shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {editingMapping ? "동의어 수정" : "새 동의어 추가"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryIcons[cat]} {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">키워드</label>
                <input
                  type="text"
                  value={formData.primary_key}
                  onChange={(e) => setFormData({ ...formData, primary_key: e.target.value })}
                  placeholder="예: 4대가입, 프리랜서"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">동의어 (쉼표로 구분)</label>
                <textarea
                  value={formData.synonyms}
                  onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                  placeholder="예: 4대보험, 직장인, 회사원, 근로자"
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  쉼표(,)로 구분하여 여러 동의어를 입력하세요
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명 (선택)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="예: 4대보험 가입 직장인"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">우선순위</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  높을수록 검색 시 우선 적용됩니다
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
