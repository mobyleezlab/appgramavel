import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Users as UsersIcon, UserPlus, Activity, TrendingUp, Search, Eye, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ESTADOS_BR } from "@/lib/constants";

type AdminUser = {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  gender_label: string | null;
  age: number | null;
  age_group: string | null;
  is_active: boolean | null;
  created_at: string | null;
  last_seen_at: string | null;
  activity_status: string | null;
  travel_since: string | null;
  saved_places: number | null;
  checkins: number | null;
  coupons: number | null;
  routes: number | null;
  reactions: number | null;
  
  favorite_folders: number | null;
  reviews_count: number | null;
};

type UserStats = {
  total_users: number | null;
  new_this_week: number | null;
  online_today: number | null;
  active_this_week: number | null;
  active_users: number | null;
  new_this_month: number | null;
  male_count: number | null;
  female_count: number | null;
  gender_unknown: number | null;
};

const genderOptions = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: "other", label: "Outro" },
  { value: "prefer_not_to_say", label: "Prefiro não informar" },
];

const ageOptions = ["Menor de 18", "18-24", "25-34", "35-44", "45-54", "55+", "Não informado"];

const statusOptions = [
  { value: "online_today", label: "Online hoje" },
  { value: "active_week", label: "Ativo esta semana" },
  { value: "active_month", label: "Ativo este mês" },
  { value: "inactive", label: "Inativo" },
  { value: "never", label: "Nunca acessou" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", age: "", gender: "", city: "", state: "" });

  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const [{ data: usersData }, { data: statsData }, { data: { session } }] = await Promise.all([
      supabase.from("admin_users_view").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_user_stats").select("*").single(),
      supabase.auth.getSession(),
    ]);
    setUsers((usersData as AdminUser[]) ?? []);
    setStats(statsData as UserStats | null);
    setCurrentAdminId(session?.user?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
      }
      if (filterCity && u.city !== filterCity) return false;
      if (filterState && u.state !== filterState) return false;
      if (filterGender && u.gender !== filterGender) return false;
      if (filterAge && u.age_group !== filterAge) return false;
      if (filterStatus && u.activity_status !== filterStatus) return false;
      return true;
    });
  }, [users, search, filterCity, filterState, filterGender, filterAge, filterStatus]);

  const cityOptions = useMemo(() => [...new Set(users.map(u => u.city).filter(Boolean))].sort() as string[], [users]);
  const stateOptions = useMemo(() => [...new Set(users.map(u => u.state).filter(Boolean))].sort() as string[], [users]);

  const hasFilters = filterCity || filterState || filterGender || filterAge || filterStatus;

  function clearFilters() {
    setFilterCity("");
    setFilterState("");
    setFilterGender("");
    setFilterAge("");
    setFilterStatus("");
  }

  async function handleDeleteUser(userId: string) {
    setDeleting(true);
    const { data, error } = await supabase.rpc("admin_delete_user", { p_user_id: userId });
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error ?? "Erro ao excluir usuário");
      setDeleting(false);
      return;
    }
    toast.success("Usuário excluído com sucesso");
    setConfirmDeleteUser(null);
    setUsers(prev => prev.filter(u => u.id !== userId));
    setDeleting(false);
  }

  async function handleCreateUser() {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Nome, e-mail e senha são obrigatórios");
      return;
    }
    setCreating(true);
    const ageToBirthDate = (age: string) => {
      if (!age) return undefined;
      const d = new Date();
      d.setFullYear(d.getFullYear() - parseInt(age));
      return d.toISOString().split("T")[0];
    };
    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: {
          full_name: newUser.name,
          city: newUser.city,
          state: newUser.state,
          birth_date: ageToBirthDate(newUser.age),
          gender: newUser.gender || undefined,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      toast.error("Erro ao criar usuário: " + error.message);
      setCreating(false);
      return;
    }
    toast.success(`Usuário criado! E-mail de confirmação enviado para ${newUser.email}`, { duration: 6000 });
    setCreateDialogOpen(false);
    setNewUser({ name: "", email: "", password: "", age: "", gender: "", city: "", state: "" });
    await loadUsers();
    setCreating(false);
  }

  function activityLabel(status: string | null) {
    if (status === "online_today") return "Online hoje";
    if (status === "active_week") return "Ativo";
    if (status === "active_month") return "Recente";
    return "Inativo";
  }

  function activityVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
    if (status === "online_today") return "default";
    if (status === "active_week") return "secondary";
    return "outline";
  }

  const kpis = [
    { label: "Total de usuários", value: stats?.total_users ?? 0, icon: UsersIcon },
    { label: "Novos esta semana", value: stats?.new_this_week ?? 0, icon: UserPlus },
    { label: "Online hoje", value: stats?.online_today ?? 0, icon: Activity },
    { label: "Ativos esta semana", value: stats?.active_this_week ?? 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Usuários</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo usuário
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="border rounded-2xl p-4 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <kpi.icon className="h-4 w-4" />
              {kpi.label}
            </div>
            <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            {cityOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            {stateOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Sexo" /></SelectTrigger>
          <SelectContent>
            {genderOptions.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAge} onValueChange={setFilterAge}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Faixa etária" /></SelectTrigger>
          <SelectContent>
            {ageOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </p>

      {/* Table */}
      <div className="border rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Idade / Sexo</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Atividade</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar_url ?? ""} className="object-cover" />
                      <AvatarFallback>{u.name?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {[u.city, u.state].filter(Boolean).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{u.age ? `${u.age} anos` : "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.gender_label}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "Nunca"}
                  </div>
                  <Badge variant={activityVariant(u.activity_status)} className="text-[10px] mt-0.5">
                    {activityLabel(u.activity_status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span title="Lugares salvos">📍 {u.saved_places ?? 0}</span>
                    <span title="Check-ins">✓ {u.checkins ?? 0}</span>
                    <span title="Pastas">📁 {u.favorite_folders ?? 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(u)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteUser(u)}
                      disabled={u.id === currentAdminId}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* User Detail Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do usuário</SheetTitle>
          </SheetHeader>

          {selectedUser && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url ?? ""} className="object-cover" />
                  <AvatarFallback className="text-lg">{selectedUser.name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <Badge variant={selectedUser.is_active ? "default" : "outline"} className="mt-1">
                    {selectedUser.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dados pessoais</h4>
                {[
                  { label: "Telefone", value: selectedUser.phone || "Não informado" },
                  { label: "Idade", value: selectedUser.age ? `${selectedUser.age} anos` : "Não informado" },
                  { label: "Sexo", value: selectedUser.gender_label || "Não informado" },
                  { label: "Cidade", value: selectedUser.city || "Não informado" },
                  { label: "Estado", value: selectedUser.state || "Não informado" },
                  { label: "País", value: selectedUser.country || "Brasil" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">Atividade no app</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Lugares salvos", value: selectedUser.saved_places, icon: "📍" },
                    { label: "Pastas", value: selectedUser.favorite_folders, icon: "📁" },
                    { label: "Check-ins", value: selectedUser.checkins, icon: "✓" },
                    { label: "Cupons", value: selectedUser.coupons, icon: "🎟️" },
                    { label: "Roteiros", value: selectedUser.routes, icon: "🗺️" },
                    { label: "Reações", value: selectedUser.reactions, icon: "❤️" },
                    { label: "Avaliações", value: selectedUser.reviews_count, icon: "⭐" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex items-center gap-2 p-2 rounded-2xl bg-muted/50">
                      <span>{icon}</span>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-semibold text-sm">{value ?? 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cadastrado em</span>
                  <span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("pt-BR") : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último acesso</span>
                  <span>{selectedUser.last_seen_at ? new Date(selectedUser.last_seen_at).toLocaleString("pt-BR") : "Nunca"}</span>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDeleteUser} onOpenChange={() => setConfirmDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir permanentemente{" "}
              <strong>{confirmDeleteUser?.name}</strong> e todos os seus dados:
              favoritos, reações, check-ins, roteiros, memórias e arquivos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteUser && handleDeleteUser(confirmDeleteUser.id!)}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>O usuário receberá um e-mail para confirmar a conta.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div>
              <Label>Senha temporária *</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">O usuário poderá trocar a senha depois.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Idade</Label>
                <Input type="number" min={13} max={99} placeholder="Ex: 25" value={newUser.age} onChange={e => setNewUser({ ...newUser, age: e.target.value })} />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={newUser.gender} onValueChange={v => setNewUser({ ...newUser, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {genderOptions.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input value={newUser.city} onChange={e => setNewUser({ ...newUser, city: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={newUser.state} onValueChange={v => setNewUser({ ...newUser, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(e => (
                      <SelectItem key={e.uf} value={e.uf}>{e.nome} ({e.uf})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : <><UserPlus className="h-4 w-4 mr-2" /> Criar usuário</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
