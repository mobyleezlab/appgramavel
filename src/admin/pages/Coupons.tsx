import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Plus, Pencil, Trash2, Search, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCodeSVG from "react-qr-code";

const CATEGORIES = ["Todos", "Gastronomia", "Hospedagem", "Compras", "Lazer", "Beleza"];
const STATUSES = ["Todos", "active", "expired"];

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [qrOpen, setQrOpen] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", code: "", category: "", image: "", expires_at: "",
    status: "active", establishment_id: "",
    rules: "", min_order_value: "", max_uses: "", max_uses_per_user: "1",
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("coupons")
      .select("*, coupon_rules(*)")
      .order("created_at", { ascending: false });
    setCoupons(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase.from("establishments").select("id, name").order("name").then(({ data }) => setEstablishments(data ?? []));
  }, []);

  const filtered = coupons
    .filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    .filter(c => catFilter === "Todos" || c.category === catFilter)
    .filter(c => statusFilter === "Todos" || c.status === statusFilter);

  function openNew() {
    setEditing(null);
    setForm({ title: "", code: generateCode(), category: "", image: "", expires_at: "", status: "active", establishment_id: "", rules: "", min_order_value: "", max_uses: "", max_uses_per_user: "1" });
    setSheetOpen(true);
  }

  function openEdit(c: any) {
    setEditing(c);
    const rules = c.coupon_rules?.[0] ?? c.coupon_rules ?? {};
    setForm({
      title: c.title, code: c.code, category: c.category ?? "", image: c.image ?? "",
      expires_at: c.expires_at?.slice(0, 10) ?? "", status: c.status ?? "active",
      establishment_id: c.establishment_id ?? "",
      rules: rules.rules ?? "", min_order_value: String(rules.min_order_value ?? ""),
      max_uses: String(rules.max_uses ?? ""), max_uses_per_user: String(rules.max_uses_per_user ?? "1"),
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.title || !form.code || !form.expires_at) { toast.error("Preencha os campos obrigatórios"); return; }

    const payload: any = {
      title: form.title, code: form.code, category: form.category || null,
      image: form.image || null, expires_at: form.expires_at, status: form.status,
      establishment_id: form.establishment_id || null,
    };

    let couponId = editing?.id;

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload as never).eq("id", couponId);
      if (error) { toast.error("Erro ao atualizar"); return; }
    } else {
      const { data, error } = await supabase.from("coupons").insert(payload as never).select().single();
      if (error || !data) { toast.error("Erro ao criar"); return; }
      couponId = data.id;
    }

    // Upsert rules
    if (couponId) {
      await supabase.from("coupon_rules").upsert({
        coupon_id: couponId,
        rules: form.rules || null,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user ? parseInt(form.max_uses_per_user) : 1,
      } as never, { onConflict: "coupon_id" });
    }

    toast.success(editing ? "Cupom atualizado" : "Cupom criado");
    setSheetOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("coupon_rules").delete().eq("coupon_id", id);
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Cupom excluído");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cupons</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo cupom</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === "Todos" ? "Todos" : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="border rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cupom encontrado</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                <TableCell>{c.category ?? "—"}</TableCell>
                <TableCell>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell>
                  <StatusBadge
                    label={c.status ?? "active"}
                    variant={c.status === "active" ? "success" : c.status === "expired" ? "muted" : "info"}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setQrOpen(c.code)} aria-label="Ver QR code">
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar cupom">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Excluir cupom"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
                          <AlertDialogDescription>O cupom "{c.title}" será removido.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* QR Code Dialog */}
      {qrOpen && (
        <AlertDialog open onOpenChange={() => setQrOpen(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>QR Code — {qrOpen}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="flex justify-center py-4">
              <QRCodeSVG value={qrOpen} size={200} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar" : "Novo"} Cupom</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Código *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></div>
            <div><Label>Estabelecimento</Label>
              <Select value={form.establishment_id} onValueChange={v => setForm(p => ({ ...p, establishment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{establishments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></div>
            <div><Label>Imagem (URL)</Label><Input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} /></div>
            <div><Label>Data de Expiração *</Label><Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <hr />
            <p className="text-sm font-semibold">Regras de Uso</p>
            <div><Label>Regras</Label><Textarea value={form.rules} onChange={e => setForm(p => ({ ...p, rules: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Valor mínimo</Label><Input type="number" value={form.min_order_value} onChange={e => setForm(p => ({ ...p, min_order_value: e.target.value }))} /></div>
              <div><Label>Máx. usos</Label><Input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} /></div>
              <div><Label>Máx. /usuário</Label><Input type="number" value={form.max_uses_per_user} onChange={e => setForm(p => ({ ...p, max_uses_per_user: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSave}>Salvar</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function generateCode() {
  return "GRAM" + Math.random().toString(36).substring(2, 8).toUpperCase();
}
