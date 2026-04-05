import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencySymbol } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Trash2, Edit, Shield, ImageIcon, Search, X, Images, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const Products = () => {
  const { t } = useTranslation();
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

  const [form, setForm] = useState({
    name: "", description: "", category: "celular", condition: "nuevo",
    purchase_price: "", selling_price: "", stock: "1", warranty_days: "0", notes: "", currency: "NIO",
  });

  const resetForm = () => {
    setForm({ name: "", description: "", category: "celular", condition: "nuevo", purchase_price: "", selling_price: "", stock: "1", warranty_days: "0", notes: "", currency: "NIO" });
    setPhotoFile(null); setPhotoPreview(null); setGalleryFiles([]); setGalleryPreviews([]);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description || "", category: p.category, condition: p.condition, purchase_price: String(p.purchase_price), selling_price: String(p.selling_price), stock: String(p.stock), warranty_days: String(p.warranty_days), notes: p.notes || "", currency: p.currency });
    setPhotoPreview(p.photo_url); setGalleryFiles([]); setGalleryPreviews([]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { toast({ title: t("common.error"), description: "Max 5MB", variant: "destructive" }); return; }
      setPhotoFile(file);
      const reader = new FileReader(); reader.onload = (ev) => setPhotoPreview(ev.target?.result as string); reader.readAsDataURL(file);
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => { if (f.size > 5 * 1024 * 1024) { toast({ title: t("common.error"), description: `${f.name} > 5MB`, variant: "destructive" }); return false; } return true; });
    setGalleryFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => { const reader = new FileReader(); reader.onload = (ev) => { setGalleryPreviews(prev => [...prev, ev.target?.result as string]); }; reader.readAsDataURL(file); });
    if (e.target) e.target.value = "";
  };

  const removeGalleryItem = (index: number) => { setGalleryFiles(prev => prev.filter((_, i) => i !== index)); setGalleryPreviews(prev => prev.filter((_, i) => i !== index)); };

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
    if (!form.name || !form.selling_price) { toast({ title: t("common.error"), description: t("common.required"), variant: "destructive" }); return; }
    setUploading(true);
    const productData = {
      name: form.name, description: form.description || null, category: form.category, condition: form.condition,
      purchase_price: parseFloat(form.purchase_price) || 0, selling_price: parseFloat(form.selling_price),
      stock: parseInt(form.stock) || 0, warranty_days: parseInt(form.warranty_days) || 0,
      notes: form.notes || null, currency: form.currency, is_active: true, photo_url: editProduct?.photo_url || null,
    };
    try {
      if (editProduct) {
        const photoUrl = await uploadPhoto(editProduct.id);
        await updateProduct.mutateAsync({ id: editProduct.id, ...productData, ...(photoUrl ? { photo_url: photoUrl } : {}) });
        if (galleryFiles.length > 0) { await addProductImages(editProduct.id, galleryFiles); }
        setEditProduct(null);
      } else {
        const result = await createProduct.mutateAsync(productData);
        const photoUrl = await uploadPhoto(result.id);
        if (photoUrl) await updateProduct.mutateAsync({ id: result.id, photo_url: photoUrl });
        if (galleryFiles.length > 0) { await addProductImages(result.id, galleryFiles); }
        setIsAddOpen(false);
      }
      resetForm();
    } catch (error) { console.error(error); } finally { setUploading(false); }
  };

  const handleDeleteImage = async (imageId: string) => {
    try { await deleteProductImage(imageId); toast({ title: t("common.success") }); } catch { toast({ title: t("common.error"), variant: "destructive" }); }
  };

  const filtered = products.filter(p => p.is_active && (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.includes(searchTerm.toLowerCase())));

  if (!isAdmin) {
    return (<div className="flex items-center justify-center h-64"><div className="text-center"><Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">{t("employeesPage.noPermission")}</p></div></div>);
  }

  const allImages = (p: Product) => { const imgs: string[] = []; if (p.photo_url) imgs.push(p.photo_url); if (p.images) p.images.forEach(i => imgs.push(i.image_url)); return imgs; };

  const formContent = (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2"><Label>{t("productsPage.productName")} *</Label><Input placeholder="iPhone 14 Pro Max" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("common.category")}</Label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="celular">{t("productsPage.phone")}</SelectItem><SelectItem value="accesorio">{t("productsPage.accessory")}</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>{t("common.condition")}</Label>
          <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nuevo">{t("common.new")}</SelectItem><SelectItem value="usado">{t("common.used")}</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>{t("productsPage.purchasePrice")}</Label><Input type="number" placeholder="0.00" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("productsPage.sellingPrice")} *</Label><Input type="number" placeholder="0.00" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("productsPage.stock")}</Label><Input type="number" placeholder="1" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("productsPage.warrantyDays")}</Label><Input type="number" placeholder="0" value={form.warranty_days} onChange={e => setForm({ ...form, warranty_days: e.target.value })} /></div>
        <div className="space-y-2"><Label>{t("common.currency")}</Label>
          <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="NIO">C$ Córdobas</SelectItem><SelectItem value="USD">$ Dólares</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2"><Label>{t("common.description")}</Label><Textarea placeholder="..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div className="space-y-2"><Label>{t("common.notes")}</Label><Input placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="space-y-2"><Label>{t("productsPage.photo")}</Label>
        <div className="flex items-start gap-4">
          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            {photoPreview ? (<img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />) : (<><ImageIcon className="h-6 w-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">{t("newRepair.uploadPhoto")}</span></>)}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
          {photoPreview && <Button type="button" variant="outline" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>{t("common.remove")}</Button>}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Images className="h-4 w-4" />{t("productsPage.gallery")}</Label>
        <p className="text-xs text-muted-foreground">{t("productsPage.galleryDesc")}</p>
        {editProduct?.images && editProduct.images.length > 0 && (
          <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">:</p>
            <div className="flex flex-wrap gap-2">{editProduct.images.map(img => (
              <div key={img.id} className="relative group"><img src={img.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                <button type="button" onClick={() => handleDeleteImage(img.id)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
              </div>
            ))}</div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {galleryPreviews.map((preview, i) => (
            <div key={i} className="relative group"><img src={preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
              <button type="button" onClick={() => removeGalleryItem(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
            </div>
          ))}
          <button type="button" onClick={() => galleryInputRef.current?.click()} className="flex flex-col items-center justify-center w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"><Plus className="h-5 w-5 text-muted-foreground" /></button>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryChange} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("productsPage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("productsPage.subtitle")}</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />{t("productsPage.addProduct")}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t("productsPage.addProduct")}</DialogTitle><DialogDescription>{t("productsPage.subtitle")}</DialogDescription></DialogHeader>
            {formContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>{t("common.cancel")}</Button>
              <Button onClick={handleSubmit} disabled={uploading}>{uploading ? t("common.uploading") : t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t("productsPage.searchPlaceholder")} className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" />{t("productsPage.title")} ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (<div className="text-center py-12 text-muted-foreground animate-pulse">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("productsPage.noProducts")}</p></div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t("productsPage.productName")}</TableHead><TableHead>{t("common.category")}</TableHead><TableHead>{t("common.condition")}</TableHead>
                  <TableHead className="text-right">{t("common.price")}</TableHead><TableHead className="text-right">{t("productsPage.stock")}</TableHead>
                  <TableHead>{t("common.warranty")}</TableHead><TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(p => {
                    const imgs = allImages(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {imgs.length > 0 ? (<button onClick={() => { setViewGallery(p); setGalleryIndex(0); }} className="relative flex-shrink-0"><img src={imgs[0]} alt={p.name} className="w-10 h-10 rounded object-cover" />{imgs.length > 1 && (<span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{imgs.length}</span>)}</button>) : null}
                            <div><div>{p.name}</div>{p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}</div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{p.category === "celular" ? `📱 ${t("productsPage.phone")}` : `🔌 ${t("productsPage.accessory")}`}</Badge></TableCell>
                        <TableCell><Badge variant={p.condition === "nuevo" ? "default" : "outline"}>{p.condition === "nuevo" ? t("common.new") : t("common.used")}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{getCurrencySymbol(p.currency)}{p.selling_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right"><Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock}</Badge></TableCell>
                        <TableCell>{p.warranty_days} {t("common.days")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>{t("productsPage.deleteProduct")}</AlertDialogTitle><AlertDialogDescription>{t("productsPage.deleteProductWarning")}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteProduct.mutate(p.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
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
            <div className="md:hidden space-y-3">
              {filtered.map(p => {
                const imgs = allImages(p);
                return (
                  <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {imgs.length > 0 ? (<button onClick={() => { setViewGallery(p); setGalleryIndex(0); }} className="relative flex-shrink-0"><img src={imgs[0]} alt={p.name} className="w-12 h-12 rounded object-cover" />{imgs.length > 1 && (<span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{imgs.length}</span>)}</button>) : null}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{p.category === "celular" ? "📱" : "🔌"}</Badge>
                          <Badge variant={p.condition === "nuevo" ? "default" : "outline"} className="text-xs">{p.condition === "nuevo" ? t("common.new") : t("common.used")}</Badge>
                        </div>
                      </div>
                      <p className="font-bold text-foreground whitespace-nowrap">{getCurrencySymbol(p.currency)}{p.selling_price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span>{t("productsPage.stock")}: <Badge variant={p.stock > 0 ? "secondary" : "destructive"} className="text-xs">{p.stock}</Badge></span>
                        <span className="text-muted-foreground">{p.warranty_days}d</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(p)}><Edit className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive h-7 px-2"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t("productsPage.deleteProduct")}</AlertDialogTitle><AlertDialogDescription>{t("productsPage.deleteProductWarning")}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => deleteProduct.mutate(p.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={!!editProduct} onOpenChange={v => { if (!v) { setEditProduct(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("productsPage.editProduct")}</DialogTitle></DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditProduct(null); resetForm(); }}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={uploading}>{uploading ? t("common.uploading") : t("settings.saveChanges")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewGallery} onOpenChange={v => { if (!v) setViewGallery(null); }}>
        <DialogContent className="max-w-md p-2 sm:p-4">
          {viewGallery && (() => {
            const imgs = allImages(viewGallery);
            if (imgs.length === 0) return null;
            return (
              <div className="space-y-3">
                <DialogHeader className="px-2"><DialogTitle className="text-base">{viewGallery.name}</DialogTitle><p className="text-xs text-muted-foreground">{galleryIndex + 1} / {imgs.length}</p></DialogHeader>
                <div className="relative">
                  <img src={imgs[galleryIndex]} alt={`${viewGallery.name} - ${galleryIndex + 1}`} className="w-full aspect-square object-contain rounded-lg bg-secondary/30" />
                  {imgs.length > 1 && (<>
                    <button onClick={() => setGalleryIndex(i => (i - 1 + imgs.length) % imgs.length)} className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"><ChevronLeft className="h-5 w-5" /></button>
                    <button onClick={() => setGalleryIndex(i => (i + 1) % imgs.length)} className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"><ChevronRight className="h-5 w-5" /></button>
                  </>)}
                </div>
                {imgs.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">{imgs.map((img, i) => (
                    <button key={i} onClick={() => setGalleryIndex(i)} className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${i === galleryIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}><img src={img} alt="" className="w-full h-full object-cover" /></button>
                  ))}</div>
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
