import { useState, useRef } from "react";
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
import { Package, Plus, Trash2, Edit, Shield, ImageIcon, Search, X, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const Products = () => {
  const { isAdmin } = useAuth();
  const { products, isLoading, createProduct, updateProduct, deleteProduct, addProductImages, deleteProductImage } = useProducts();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewGallery, setViewGallery] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
    setGalleryFiles([]);
    setGalleryPreviews([]);
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
    setGalleryFiles([]);
    setGalleryPreviews([]);
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

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "Omitida", description: `${f.name} excede 5MB`, variant: "destructive" });
        return false;
      }
      return true;
    });

    setGalleryFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGalleryPreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same files can be re-selected
    if (e.target) e.target.value = "";
  };

  const removeGalleryItem = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
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

    setUploading(true);
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
        // Upload gallery images
        if (galleryFiles.length > 0) {
          await addProductImages(editProduct.id, galleryFiles);
        }
        setEditProduct(null);
      } else {
        const result = await createProduct.mutateAsync(productData);
        const photoUrl = await uploadPhoto(result.id);
        if (photoUrl) await updateProduct.mutateAsync({ id: result.id, photo_url: photoUrl });
        // Upload gallery images
        if (galleryFiles.length > 0) {
          await addProductImages(result.id, galleryFiles);
        }
        setIsAddOpen(false);
      }
      resetForm();
      toast({ title: "✅ Fotos subidas", description: galleryFiles.length > 0 ? `${galleryFiles.length} fotos adicionales guardadas` : undefined });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      await deleteProductImage(imageId);
      toast({ title: "Foto eliminada" });
    } catch {
      toast({ title: "Error al eliminar foto", variant: "destructive" });
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

  const allImages = (p: Product) => {
    const imgs: string[] = [];
    if (p.photo_url) imgs.push(p.photo_url);
    if (p.images) p.images.forEach(i => imgs.push(i.image_url));
    return imgs;
  };

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

      {/* Main photo */}
      <div className="space-y-2">
        <Label>Foto principal</Label>
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

      {/* Gallery - multi upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Images className="h-4 w-4" />
          Galería de estilos / fotos adicionales
        </Label>
        <p className="text-xs text-muted-foreground">Sube múltiples fotos de un solo (ej: todos los estilos de protectores)</p>

        {/* Existing images when editing */}
        {editProduct?.images && editProduct.images.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Fotos existentes:</p>
            <div className="flex flex-wrap gap-2">
              {editProduct.images.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New photos to upload */}
        <div className="flex flex-wrap gap-2">
          {galleryPreviews.map((preview, i) => (
            <div key={i} className="relative group">
              <img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
              <button
                type="button"
                onClick={() => removeGalleryItem(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Fotos</span>
          </button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGalleryChange}
          />
        </div>
        {galleryFiles.length > 0 && (
          <p className="text-xs text-primary">{galleryFiles.length} foto{galleryFiles.length !== 1 ? "s" : ""} nueva{galleryFiles.length !== 1 ? "s" : ""} para subir</p>
        )}
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
              <Button onClick={handleSubmit} disabled={uploading}>
                {uploading ? "Subiendo..." : "Guardar"}
              </Button>
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
            <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                  {filtered.map(p => {
                    const imgs = allImages(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {imgs.length > 0 ? (
                              <button onClick={() => { setViewGallery(p); setGalleryIndex(0); }} className="relative flex-shrink-0">
                                <img src={imgs[0]} alt={p.name} className="w-10 h-10 rounded object-cover" />
                                {imgs.length > 1 && (
                                  <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                    {imgs.length}
                                  </span>
                                )}
                              </button>
                            ) : null}
                            <div>
                              <div>{p.name}</div>
                              {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{p.category === "celular" ? "📱 Celular" : "🔌 Accesorio"}</Badge></TableCell>
                        <TableCell><Badge variant={p.condition === "nuevo" ? "default" : "outline"}>{p.condition}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{p.currency === "USD" ? "$" : "C$"}{p.selling_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right"><Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock}</Badge></TableCell>
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(p => {
                const imgs = allImages(p);
                return (
                  <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {imgs.length > 0 ? (
                        <button onClick={() => { setViewGallery(p); setGalleryIndex(0); }} className="relative flex-shrink-0">
                          <img src={imgs[0]} alt={p.name} className="w-12 h-12 rounded object-cover" />
                          {imgs.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                              {imgs.length}
                            </span>
                          )}
                        </button>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{p.category === "celular" ? "📱" : "🔌"} {p.category}</Badge>
                          <Badge variant={p.condition === "nuevo" ? "default" : "outline"} className="text-xs">{p.condition}</Badge>
                        </div>
                      </div>
                      <p className="font-bold text-foreground whitespace-nowrap">{p.currency === "USD" ? "$" : "C$"}{p.selling_price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span>Stock: <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-xs">{p.stock}</Badge></span>
                        <span className="text-muted-foreground">{p.warranty_days}d garantía</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(p)}><Edit className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive h-7 px-2"><Trash2 className="h-3 w-3" /></Button>
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
                    </div>
                  </div>
                );
              })}
            </div>
            </>
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
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Subiendo..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gallery Viewer */}
      <Dialog open={!!viewGallery} onOpenChange={v => { if (!v) setViewGallery(null); }}>
        <DialogContent className="max-w-md p-2 sm:p-4">
          {viewGallery && (() => {
            const imgs = allImages(viewGallery);
            if (imgs.length === 0) return null;
            return (
              <div className="space-y-3">
                <DialogHeader className="px-2">
                  <DialogTitle className="text-base">{viewGallery.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{galleryIndex + 1} / {imgs.length}</p>
                </DialogHeader>
                <div className="relative">
                  <img
                    src={imgs[galleryIndex]}
                    alt={`${viewGallery.name} - ${galleryIndex + 1}`}
                    className="w-full aspect-square object-contain rounded-lg bg-secondary/30"
                  />
                  {imgs.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIndex(i => (i - 1 + imgs.length) % imgs.length)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setGalleryIndex(i => (i + 1) % imgs.length)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {/* Thumbnails */}
                {imgs.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">
                    {imgs.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setGalleryIndex(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                          i === galleryIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
