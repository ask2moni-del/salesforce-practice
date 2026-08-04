import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import fetch10Products from '@salesforce/apex/ExternalProductController.fetch10Products';
import saveProductChanges from '@salesforce/apex/ExternalProductController.saveProductChanges';

export default class ProductParentContainer extends LightningElement {
    @track products = [];
    @track isModalOpen = false;
    @track currentProduct = null;

    // Fetch the 10 item list initially from public API
    @wire(fetch10Products)
    wiredData({ error, data }) {
        if (data) {
            this.products = data;
        } else if (error) {
            this.showToast('Error', 'Could not fetch data from the external API system', 'error');
        }
    }

    handleProductClick(event) {
        const productId = event.currentTarget.dataset.id;
        // Identify the exact product clicked
        this.currentProduct = this.products.find(item => item.id === productId);
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.currentProduct = null;
    }

    handleReplicateAndSave(event) {
        const modifiedProduct = event.detail.updatedProduct;

        // 1. Instantly replicate changes locally in the parent component array model
        this.products = this.products.map(item => {
            return item.id === modifiedProduct.id ? { ...modifiedProduct } : item;
        });

        // 2. Call Apex to push the updated configuration back down to the backend server
        saveProductChanges({ updatedProductsJson: JSON.stringify(this.products) })
            .then(() => {
                this.showToast('Success', 'Product updates saved and replicated successfully.', 'success');
                this.closeModal();
            })
            .catch(error => {
                this.showToast('Save Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}