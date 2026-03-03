import { useState } from "react";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Package, Plus, Trash2, Edit, Shield, ImageIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const { isAdmin } = useAuth();
  const { products, isLoading, createProduct, updateProduct, deleteProduct } = useProducts();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", category: "celular", condition: "nuevo",
    purchase_price: "", selling_price: "", stock: "1", warranty_days: "0",
    notes: "", currency: "NIO",
  });

  const resetForm = () => {
    setForm({ name: "", description: "", category: "celular", condition: "nuevo", purchase_price: "", selling_price: "", stock: "1", warranty_days: "0", notes: "", currency: "NIO" });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, description: p.description || "", category: p.category,
      condition: p.condition, purchase_price: String(p.purchase_price),
      selling_price: String(p.selling_price), stock: String(p.stock),
      warranty_days: String(p.warranty_days), notes: p.notes || "", currency: p.currency,
    });
    setPhotoPreview(p.photo_url);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: "Error", description: "La foto debe ser menor a 5MB", variant: "destructive" }); return; }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (productId: string): Promise<string | null> => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop();
    const path = `products/${productId}.${ext}`;
    const { error } = await supabase.storage.from("device-photos").upload(path, photoFile, { upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("device-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!form.name || !form.selling_price) {
      toast({ title: "Error", description: "Nombre y precio de venta son requeridos", variant: "destructive" });
      return;
    }

    const productData = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price) || 0,
      selling_price: parseFloat(form.selling_price),
      stock: parseInt(form.stock) || 0,
      warranty_days: parseInt(form.warranty_days) || 0,
      notes: form.notes || null,
      currency: form.currency,
      is_active: true,
      photo_url: editProduct?.photo_url || null,
    };

    try {
      if (editProduct) {
        const photoUrl = await uploadPhoto(editProduct.id);
        await updateProduct.mutateAsync({ id: editProduct.id, ...productData, ...(photoUrl ? { photo_url: photoUrl } : {}) });
        setEditProduct(null);
      } else {
        const result = await createProduct.mutateAsync(productData);
        const photoUrl = await uploadPhoto(result.id);
        if (photoUrl) await updateProduct.mutateAsync({ id: result.id, photo_url: photoUrl });
        setIsAddOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = products.filter(p =>
    p.is_active && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.includes(searchTerm.toLowerCase()))
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tienes permisos para ver esta página</p>
        </div>
      </div>
    );
  }

  const formContent = (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Nombre *</Label>
          <Input placeholder="iPhone 14 Pro Max" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="celular">Celular</SelectItem>
              <SelectItem value="accesorio">Accesorio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Condición</Label>
          <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nuevo">Nuevo</SelectItem>
              <SelectItem value="usado">Usado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Precio compra</Label>
          <Input type="number" placeholder="0.00" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Precio venta *</Label>
          <Input type="number" placeholder="0.00" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Stock</Label>
          <Input type="number" placeholder="1" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Garantía (días)</Label>
          <Input type="number" placeholder="0" value={form.warranty_days} onChange={e => setForm({ ...form, warranty_days: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NIO">C$ Córdobas</SelectItem>
              <SelectItem value="USD">$ Dólares</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea placeholder="Descripción del producto..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input placeholder="Detalles adicionales" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Foto del producto</Label>
        <div className="flex items-start gap-4">
          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Subir</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          {photoPreview && <Button type="button" variant="outline" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>Quitar</Button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu catálogo de celulares y accesorios</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Agregar Producto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Producto</DialogTitle>
              <DialogDescription>Agrega un producto al inventario</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar producto..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Productos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground animate-pulse">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay productos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Condición</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Garantía</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.photo_url && <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded object-cover" />}
                          <div>
                            <div>{p.name}</div>
                            {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.category === "celular" ? "📱 Celular" : "🔌 Accesorio"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.condition === "nuevo" ? "default" : "outline"}>{p.condition}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {p.currency === "USD" ? "$" : "C$"}{p.selling_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock}</Badge>
                      </TableCell>
                      <TableCell>{p.warranty_days} días</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                <AlertDialogDescription>Se eliminará {p.name} del inventario.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteProduct.mutate(p.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={v => { if (!v) { setEditProduct(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditProduct(null); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSubmit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
