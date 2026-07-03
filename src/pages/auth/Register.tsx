import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AgeScrollPicker } from "@/components/ui/AgeScrollPicker";
import logoSrc from "@/assets/logo_gramavel_header.svg";

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: "other", label: "Outro" },
  { value: "prefer_not_to_say", label: "Prefiro não informar" },
];

function ageToBirthDate(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split("T")[0];
}

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    age: null as number | null, gender: "", city: "", state: "RS",
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Senha deve ter no mínimo 8 caracteres"); return; }
    if (form.password !== form.confirmPassword) { toast.error("Senhas não conferem"); return; }
    setLoading(true);
    try {
      await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        birthDate: form.age ? ageToBirthDate(form.age) : undefined,
        gender: form.gender || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
      });
      toast.success("Conta criada! Verifique seu email.");
      navigate("/auth/login");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm shadow-card">
        <CardHeader className="text-center space-y-3">
          <img src={logoSrc} alt="Gramável" className="h-6 mx-auto" width={160} height={24} />
          <CardTitle className="text-lg font-semibold text-foreground">Criar Conta</CardTitle>
          <CardDescription>Preencha seus dados para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} required placeholder="seu@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha (mín. 8 caracteres)</Label>
              <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} required minLength={8} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} required placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Idade</Label>
              <AgeScrollPicker
                value={form.age}
                onChange={(age) => setForm(f => ({ ...f, age }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={form.gender} onValueChange={v => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Gramado" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.state} onValueChange={v => set("state", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full rounded-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Já tem conta?{" "}
            <Link to="/auth/login" className="text-primary font-semibold hover:underline">Entrar</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
