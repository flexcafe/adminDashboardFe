import type { Category } from "./categoriesApi";

type CategoryDetailsProps = {
  category: Category | null;
  parentName: string;
  breadcrumbs: Category[];
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCreateChild: () => void;
  onViewProducts: () => void;
  canViewProducts: boolean;
};

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function CategoryDetails({
  category,
  parentName,
  breadcrumbs,
  isLoading,
  onEdit,
  onDelete,
  onCreateChild,
  onViewProducts,
  canViewProducts,
}: CategoryDetailsProps) {
  if (isLoading) {
    return (
      <section className="card categoriesDetailsPanel">
        <div className="categoriesEmptyState">Loading category details...</div>
      </section>
    );
  }

  if (!category) {
    return (
      <section className="card categoriesDetailsPanel">
        <div className="categoriesEmptyState">
          Select a category or create a new one to view details here.
        </div>
      </section>
    );
  }

  return (
    <section className="card categoriesDetailsPanel">
      <div className="categoriesDetailsHero">
        <div className="categoriesDetailsHeroContent">
          <div className="categoriesDetailsTopline">
            <span className="pageEyebrow">Category Details</span>
            <span className={category.isActive ? "statusPill categoriesStatusPill" : "statusPill categoriesStatusPill inactive"}>
              {category.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <h2 className="sectionTitle categoriesDetailsTitle">{category.name}</h2>
          <div className="categoriesBreadcrumbs">
            {breadcrumbs.map((item, index) => (
              <span key={item.id} className="categoriesBreadcrumbItem">
                {index > 0 ? <span className="categoriesBreadcrumbSep">/</span> : null}
                {item.name}
              </span>
            ))}
          </div>
          <p className="sectionDescription">
            Keep naming, hierarchy, and merchandising data aligned before this category goes live on the user-facing app.
          </p>
        </div>

        <div className="categoriesDetailsActions">
          <button type="button" className="verificationActionButton subtle" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={onCreateChild}>
            Create Child
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={onViewProducts} disabled={!canViewProducts}>
            View Products
          </button>
          <button type="button" className="verificationActionButton subtle danger" onClick={onDelete}>
            Deactivate
          </button>
        </div>
      </div>

      <div className="categoriesOverviewGrid">
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">Parent</span>
          <span className="detailValue">{parentName || "Root category"}</span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">Display Order</span>
          <span className="detailValue">{category.sortOrder}</span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">Products Linked</span>
          <span className="detailValue">{category.productCount}</span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">Last Updated</span>
          <span className="detailValue">{formatDateTime(category.updatedAt)}</span>
        </div>
      </div>

      <div className="categoriesDetailsSection">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">Core Information</div>
            <p className="sectionDescription">Primary fields used for category display and structure.</p>
          </div>
        </div>
        <div className="categoriesDetailsGrid">
          <label className="sliderFormField">
            <span className="authLabel">Name</span>
            <input className="authInput" value={category.name} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">Slug</span>
            <input className="authInput" value={category.slug || "-"} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">Parent Category</span>
            <input className="authInput" value={parentName || "Root category"} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">Image / Icon URL</span>
            <input className="authInput" value={category.iconUrl || category.imageUrl || "-"} readOnly />
          </label>
        </div>
      </div>

      <div className="categoriesDetailsSection">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">Description</div>
            <p className="sectionDescription">Reference copy for merchandising and customer-facing context.</p>
          </div>
        </div>
        <div className="categoriesDetailsDescription">
          <label className="sliderFormField">
            <span className="authLabel">Description</span>
            <textarea className="authInput categoriesTextarea" value={category.description || ""} readOnly />
          </label>
        </div>
      </div>

      <div className="categoriesDetailsSection">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">Audit Information</div>
            <p className="sectionDescription">Quick operational context for when this category was created and updated.</p>
          </div>
        </div>
        <div className="categoriesMetaGrid">
          <div className="detailItem">
            <span className="detailLabel">Created At</span>
            <span className="detailValue">{formatDateTime(category.createdAt)}</span>
          </div>
          <div className="detailItem">
            <span className="detailLabel">Updated At</span>
            <span className="detailValue">{formatDateTime(category.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="categoriesSeoPanel">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">SEO Meta</div>
            <p className="sectionDescription">Helpful for search preview and metadata consistency.</p>
          </div>
        </div>
        <div className="categoriesDetailsGrid">
          <label className="sliderFormField">
            <span className="authLabel">Meta Title</span>
            <input className="authInput" value={category.metaTitle || ""} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">Meta Keywords</span>
            <input className="authInput" value={category.metaKeywords.join(", ")} readOnly />
          </label>
        </div>
        <label className="sliderFormField">
          <span className="authLabel">Meta Description</span>
          <textarea className="authInput categoriesTextarea" value={category.metaDescription || ""} readOnly />
        </label>
      </div>
    </section>
  );
}
