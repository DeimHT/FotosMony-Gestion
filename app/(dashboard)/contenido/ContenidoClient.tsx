"use client";

import { useState } from "react";
import { HomeSection, PortfolioItem } from "@/types";
import { createClient } from "@/lib/supabase/client";
import {
  FileImage,
  Save,
  Loader2,
  Plus,
  Pencil,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  Image,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import ImageUpload from "@/components/ui/ImageUpload";

// Claves que se consideran campos de imagen (case-insensitive)
const IMAGE_KEYS = ["image_url", "imagen_url", "foto_url", "cover_url", "bg_url", "background_url"];

interface Props {
  initialSections: HomeSection[];
  initialPortfolio: PortfolioItem[];
}

export default function ContenidoClient({ initialSections, initialPortfolio }: Props) {
  const [sections, setSections] = useState<HomeSection[]>(initialSections);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(initialPortfolio);
  const [activeTab, setActiveTab] = useState<"home" | "portfolio">("home");
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});

  // Portfolio form
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioForm, setPortfolioForm] = useState({
    titulo: "",
    descripcion: "",
    cover_public_id: "",
    orden: 0,
    activo: true,
  });
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [errorPortfolio, setErrorPortfolio] = useState<string | null>(null);

  function getSectionContent(section: HomeSection): Record<string, string> {
    const content = section.content as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(content).map(([k, v]) => [k, String(v ?? "")])
    );
  }

  function getEditableContent(sectionId: string, section: HomeSection) {
    if (editingContent[sectionId] !== undefined) {
      try {
        return JSON.parse(editingContent[sectionId]) as Record<string, string>;
      } catch {
        return getSectionContent(section);
      }
    }
    return getSectionContent(section);
  }

  async function saveSection(section: HomeSection) {
    setSavingSection(section.id);
    const supabase = createClient();
    let contentToSave = section.content;
    if (editingContent[section.id]) {
      try {
        contentToSave = JSON.parse(editingContent[section.id]);
      } catch {
        contentToSave = section.content;
      }
    }
    const { data } = await supabase
      .from("home_sections")
      .update({ content: contentToSave, updated_at: new Date().toISOString() })
      .eq("id", section.id)
      .select()
      .single();
    if (data) {
      setSections(sections.map((s) => (s.id === section.id ? data : s)));
      setSavedSection(section.id);
      setTimeout(() => setSavedSection(null), 2000);
    }
    setSavingSection(null);
  }

  function updateField(sectionId: string, section: HomeSection, field: string, value: string) {
    const current = getEditableContent(sectionId, section);
    const updated = { ...current, [field]: value };
    setEditingContent({ ...editingContent, [sectionId]: JSON.stringify(updated) });
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, content: updated } : s))
    );
  }

  // Portfolio
  function openNewPortfolio() {
    setEditingPortfolioId(null);
    setPortfolioForm({ titulo: "", descripcion: "", cover_public_id: "", orden: portfolio.length, activo: true });
    setErrorPortfolio(null);
    setShowPortfolioForm(true);
  }

  function openEditPortfolio(item: PortfolioItem) {
    setEditingPortfolioId(item.id);
    setPortfolioForm({
      titulo: item.titulo,
      descripcion: item.descripcion || "",
      cover_public_id: item.cover_public_id || "",
      orden: item.orden,
      activo: item.activo,
    });
    setErrorPortfolio(null);
    setShowPortfolioForm(true);
  }

  async function savePortfolioItem() {
    if (!portfolioForm.titulo.trim()) {
      setErrorPortfolio("El título es obligatorio");
      return;
    }
    setLoadingPortfolio(true);
    setErrorPortfolio(null);
    const supabase = createClient();
    const payload = {
      titulo: portfolioForm.titulo.trim(),
      descripcion: portfolioForm.descripcion.trim() || null,
      cover_public_id: portfolioForm.cover_public_id.trim() || null,
      orden: portfolioForm.orden,
      activo: portfolioForm.activo,
    };
    if (editingPortfolioId) {
      const { data, error } = await supabase
        .from("portfolio_items")
        .update(payload)
        .eq("id", editingPortfolioId)
        .select()
        .single();
      if (error) { setErrorPortfolio(error.message); setLoadingPortfolio(false); return; }
      setPortfolio(portfolio.map((p) => (p.id === editingPortfolioId ? data : p)));
    } else {
      const { data, error } = await supabase
        .from("portfolio_items")
        .insert(payload)
        .select()
        .single();
      if (error) { setErrorPortfolio(error.message); setLoadingPortfolio(false); return; }
      setPortfolio([...portfolio, data]);
    }
    setShowPortfolioForm(false);
    setLoadingPortfolio(false);
  }

  async function togglePortfolioActive(item: PortfolioItem) {
    const supabase = createClient();
    const { data } = await supabase
      .from("portfolio_items")
      .update({ activo: !item.activo })
      .eq("id", item.id)
      .select()
      .single();
    if (data) setPortfolio(portfolio.map((p) => (p.id === item.id ? data : p)));
  }

  async function deletePortfolioItem(id: string) {
    if (!confirm("¿Eliminar este ítem del portafolio?")) return;
    const supabase = createClient();
    await supabase.from("portfolio_items").delete().eq("id", id);
    setPortfolio(portfolio.filter((p) => p.id !== id));
    setShowPortfolioForm(false);
  }

  const SECTION_LABELS: Record<string, string> = {
    hero: "Sección Hero (inicio de la página)",
    about: "Sección Sobre Nosotros",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <FileImage size={22} style={{ color: "var(--accent)" }} />
          Contenido Web
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Gestiona el contenido del sitio fotosmony.cl
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {[
          { id: "home", label: "Secciones de inicio" },
          { id: "portfolio", label: `Portafolio (${portfolio.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "home" | "portfolio")}
            className="px-4 py-2.5 text-sm font-medium transition-all relative"
            style={{ color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)" }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Home sections */}
      {activeTab === "home" && (
        <div className="space-y-4">
          {sections.map((section) => {
            const content = getSectionContent(section);
            const isSaving = savingSection === section.id;
            const isSaved = savedSection === section.id;

            return (
              <div key={section.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {SECTION_LABELS[section.id] || section.id}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Última actualización: {formatDate(section.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => saveSection(section)}
                    disabled={isSaving}
                    className="btn-primary text-sm"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isSaved ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    {isSaved ? "Guardado" : "Guardar"}
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(content).map(([field, value]) => {
                    const isImageField = IMAGE_KEYS.some(
                      (k) => field.toLowerCase() === k || field.toLowerCase().includes("image") || field.toLowerCase().includes("imagen")
                    );
                    return (
                      <div key={field}>
                        <label
                          className="block text-xs font-semibold mb-1 uppercase tracking-wider"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {field}
                        </label>
                        {isImageField ? (
                          <ImageUpload
                            value={value}
                            onChange={(url) => updateField(section.id, section, field, url)}
                            folder="home"
                          />
                        ) : value.length > 80 ? (
                          <textarea
                            value={value}
                            onChange={(e) => updateField(section.id, section, field, e.target.value)}
                            className="input-field h-24 resize-y"
                            rows={3}
                          />
                        ) : (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateField(section.id, section, field, e.target.value)}
                            className="input-field"
                          />
                        )}
                      </div>
                    );
                  })}

                  {Object.keys(content).length === 0 && (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Esta sección no tiene contenido configurable aún.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {sections.length === 0 && (
            <div className="card text-center py-8" style={{ color: "var(--text-muted)" }}>
              <p>No hay secciones configurables</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio */}
      {activeTab === "portfolio" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {portfolio.filter((p) => p.activo).length} activos
            </p>
            <button onClick={openNewPortfolio} className="btn-primary">
              <Plus size={16} />
              Agregar ítem
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{ opacity: item.activo ? 1 : 0.5 }}
              >
                {/* Cover */}
                <div
                  className="w-full h-32 rounded-lg mb-3 flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--bg-primary)" }}
                >
                  {item.cover_public_id ? (
                    <img
                      src={item.cover_public_id}
                      alt={item.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <Image size={28} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                  )}
                </div>

                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {item.titulo}
                </h3>
                {item.descripcion && (
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {item.descripcion}
                  </p>
                )}

                <div
                  className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div className="flex gap-1.5">
                    <span className={`badge ${item.activo ? "badge-green" : "badge-gray"}`}>
                      {item.activo ? "Activo" : "Oculto"}
                    </span>
                    <span className="badge badge-gray">#{item.orden}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => togglePortfolioActive(item)} className="p-1.5" style={{ color: "var(--text-muted)" }}>
                      {item.activo ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => openEditPortfolio(item)} className="p-1.5" style={{ color: "var(--text-muted)" }}>
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {portfolio.length === 0 && (
            <div className="card text-center py-10" style={{ color: "var(--text-muted)" }}>
              <Image size={36} className="mx-auto mb-2 opacity-20" />
              <p>No hay ítems en el portafolio</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio form modal */}
      {showPortfolioForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {editingPortfolioId ? "Editar ítem" : "Nuevo ítem de portafolio"}
              </h3>
              <button onClick={() => setShowPortfolioForm(false)} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Título *</label>
                <input type="text" value={portfolioForm.titulo} onChange={(e) => setPortfolioForm({ ...portfolioForm, titulo: e.target.value })} className="input-field" placeholder="Título del trabajo" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Descripción</label>
                <textarea value={portfolioForm.descripcion} onChange={(e) => setPortfolioForm({ ...portfolioForm, descripcion: e.target.value })} className="input-field h-20 resize-none" placeholder="Descripción..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Imagen de portada</label>
                <ImageUpload
                  value={portfolioForm.cover_public_id}
                  onChange={(url) => setPortfolioForm({ ...portfolioForm, cover_public_id: url })}
                  folder="portfolio"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Orden</label>
                  <input type="number" min={0} value={portfolioForm.orden} onChange={(e) => setPortfolioForm({ ...portfolioForm, orden: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={portfolioForm.activo} onChange={(e) => setPortfolioForm({ ...portfolioForm, activo: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Activo</span>
                  </label>
                </div>
              </div>

              {errorPortfolio && (
                <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {errorPortfolio}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex gap-2">
                <button onClick={savePortfolioItem} disabled={loadingPortfolio} className="btn-primary">
                  {loadingPortfolio && <Loader2 size={14} className="animate-spin" />}
                  {editingPortfolioId ? "Guardar" : "Crear"}
                </button>
                <button onClick={() => setShowPortfolioForm(false)} className="btn-secondary">Cancelar</button>
              </div>
              {editingPortfolioId && (
                <button onClick={() => deletePortfolioItem(editingPortfolioId)} className="text-sm" style={{ color: "var(--danger)" }}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
