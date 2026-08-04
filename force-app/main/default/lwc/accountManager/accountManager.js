import { LightningElement, track, wire } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getPicklistValues } from 'lightning/uiObjectInfoApi';

import getAccounts from '@salesforce/apex/AccountController.getAccounts';

import INDUSTRY_FIELD from '@salesforce/schema/Account.Industry';
import TYPE_FIELD from '@salesforce/schema/Account.Type';
import RATING_FIELD from '@salesforce/schema/Account.Rating';

export default class AccountManager extends LightningElement {
    @track filteredAccounts = [];
    updatedRecords = new Map();

    // Filter Variables
    searchKey = '';
    industryFilter = 'All';
    typeFilter = 'All';
    ratingFilter = 'All';

    // Pagination Variables
    pageNumber = 1;
    pageSize = 5; 
    isLastPage = false; 

    industryOptions = [{ label: 'All', value: 'All' }];
    typeOptions = [{ label: 'All', value: 'All' }];
    ratingOptions = [{ label: 'All', value: 'All' }];

    priorityOptions = [
        { label: 'High', value: 'High' }, { label: 'Medium', value: 'Medium' }, { label: 'Low', value: 'Low' }
    ];
    slaOptions = [
        { label: 'Gold', value: 'Gold' }, { label: 'Silver', value: 'Silver' }, { label: 'Bronze', value: 'Bronze' }
    ];

    @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: INDUSTRY_FIELD })
    wiredIndustry({ data }) { if (data) this.industryOptions = [{ label: 'All', value: 'All' }, ...data.values.map(d => ({ label: d.label, value: d.value }))]; }

    @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: TYPE_FIELD })
    wiredType({ data }) { if (data) this.typeOptions = [{ label: 'All', value: 'All' }, ...data.values.map(d => ({ label: d.label, value: d.value }))]; }

    @wire(getPicklistValues, { recordTypeId: '012000000000000AAA', fieldApiName: RATING_FIELD })
    wiredRating({ data }) { if (data) this.ratingOptions = [{ label: 'All', value: 'All' }, ...data.values.map(d => ({ label: d.label, value: d.value }))]; }

    get industryOptionsWithoutAll() { return this.industryOptions.filter(opt => opt.value !== 'All'); }
    get typeOptionsWithoutAll() { return this.typeOptions.filter(opt => opt.value !== 'All'); }
    get ratingOptionsWithoutAll() { return this.ratingOptions.filter(opt => opt.value !== 'All'); }
    
    // Dynamic Pagination Checks
    get hasRecords() { return this.filteredAccounts && this.filteredAccounts.length > 0; }
    get isFirstPage() { return this.pageNumber === 1; }

    connectedCallback() {
        this.fetchLiveAccounts();
    }

    handleSearchChange(event) { this.searchKey = event.target.value; this.pageNumber = 1; this.fetchLiveAccounts(); }
    handleIndustryFilterChange(event) { this.industryFilter = event.target.value; this.pageNumber = 1; this.fetchLiveAccounts(); }
    handleTypeFilterChange(event) { this.typeFilter = event.target.value; this.pageNumber = 1; this.fetchLiveAccounts(); }
    handleRatingFilterChange(event) { this.ratingFilter = event.target.value; this.pageNumber = 1; this.fetchLiveAccounts(); }

    fetchLiveAccounts() {
        getAccounts({
            searchKey: this.searchKey,
            industryFilter: this.industryFilter,
            typeFilter: this.typeFilter,
            ratingFilter: this.ratingFilter,
            pageNumber: this.pageNumber,
            pageSize: this.pageSize
        })
        .then(result => {
            this.filteredAccounts = result.map(record => ({ ...record }));
            // If the database returns less than 5 items, we are on the last page.
            this.isLastPage = result.length < this.pageSize;
        })
        .catch(error => {
            this.showToast('Error', 'Failed to retrieve records: ' + (error.body?.message || error.message), 'error');
        });
    }

    handlePreviousPage() {
        if (this.pageNumber > 1) {
            if (this.confirmPageLeave()) {
                this.pageNumber--;
                this.fetchLiveAccounts();
            }
        }
    }

    handleNextPage() {
        if (!this.isLastPage) {
            if (this.confirmPageLeave()) {
                this.pageNumber++;
                this.fetchLiveAccounts();
            }
        }
    }

    confirmPageLeave() {
        if (this.updatedRecords.size > 0) {
            return confirm('You have unsaved changes on this page. Leaving will lose your work. Proceed?');
        }
        return true;
    }

    handleClearFilters() {
        this.searchKey = '';
        this.industryFilter = 'All';
        this.typeFilter = 'All';
        this.ratingFilter = 'All';
        this.pageNumber = 1;
        this.fetchLiveAccounts();
    }

    handleFieldChange(event) {
        const recordId = event.target.dataset.id;
        const fieldName = event.target.dataset.field;
        const value = event.target.value;

        let recordToUpdate = this.filteredAccounts.find(acc => acc.Id === recordId);
        if (recordToUpdate) {
            recordToUpdate[fieldName] = value;
        }

        if (!this.updatedRecords.has(recordId)) {
            this.updatedRecords.set(recordId, { Id: recordId });
        }
        this.updatedRecords.get(recordId)[fieldName] = value;
    }

    async handleSave() {
        if (this.updatedRecords.size === 0) {
            this.showToast('Info', 'No changes to save.', 'info');
            return;
        }

        const recordInputs = Array.from(this.updatedRecords.values()).map(fields => ({ fields }));
        
        try {
            const promises = recordInputs.map(recordInput => updateRecord(recordInput));
            await Promise.all(promises);

            this.showToast('Success', 'Records updated successfully!', 'success');
            this.updatedRecords.clear();
            this.fetchLiveAccounts();
        } catch (error) {
            this.showToast('Error saving records', error.body?.message || 'An error occurred', 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}