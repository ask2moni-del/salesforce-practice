import { LightningElement, api, track } from 'lwc';

export default class ProductDetailModal extends LightningElement {
    @api isOpen = false;
    @track editableProduct = {};

    @api 
    get selectedProduct() {
        return this.editableProduct;
    }
    set selectedProduct(value) {
        if (value) {
            // Shallow clone the object to allow mutation without violating data flow rules
            this.editableProduct = { ...value };
        }
    }

    // Dynamic handling of input updates across fields
    handleFieldChange(event) {
        const fieldName = event.target.dataset.field;
        this.editableProduct[fieldName] = event.target.value;
    }

    handleClose() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    handleSave() {
        // Fire custom save event passing the mutated item to the parent component
        this.dispatchEvent(new CustomEvent('save', {
            detail: { updatedProduct: this.editableProduct }
        }));
    }
}

