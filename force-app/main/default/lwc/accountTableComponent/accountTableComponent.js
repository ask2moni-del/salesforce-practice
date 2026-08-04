import { LightningElement, wire, track } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';

import ACCOUNT_OBJECT from '@salesforce/schema/Account';
import TYPE_FIELD from '@salesforce/schema/Account.Type';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class AccountTableComponent extends LightningElement {
    @track data = [];
    @track filteredAccounts = [];
    @track draftValues = {}; // Maps Record ID -> Field updates payload
    
    // Filter conditions tracking state
    searchKey = '';
    emailSearchKey = '';
    chosenType = '';
    
    @track typeOptions = [{ label: 'All', value: '' }];
    @track inlineTypeOptions = []; 
    @track showSaveButton = false;

    wiredAccountsResult;

    @wire(getObjectInfo, { objectApiName: ACCOUNT_OBJECT })
    objectInfo;

    // Dynamically wire the Account Type picklist values for both global filter & row dropdowns
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: TYPE_FIELD })
    wiredTypeValues({ error, data }) {
        if (data) {
            // Options for the filter dropdown (includes 'All')
            this.typeOptions = [{ label: 'All', value: '' }, ...data.values.map(item => ({ label: item.label, value: item.value }))];
            // Options for the true inline dropdown columns in the list
            this.inlineTypeOptions = data.values.map(item => ({ label: item.label, value: item.value }));
        }
    }

    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        if (result.data) {
            // Shallow clone objects to support instant front-end view mutation responsiveness
            this.data = result.data.map(account => ({ ...account }));
            this.applyFilters();
        } else if (result.error) {
            this.showToast('Error', 'Error retrieving account dataset.', 'error');
        }
    }

    // Filter Change Event Subscriptions
    handleSearchChange(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.applyFilters();
    }

    handleEmailSearchChange(event) {
        this.emailSearchKey = event.target.value.toLowerCase();
        this.applyFilters();
    }

    handleTypeFilterChange(event) {
        this.chosenType = event.target.value;
        this.applyFilters();
    }

    handleClearFilters() {
        this.searchKey = '';
        this.emailSearchKey = '';
        this.chosenType = '';
        this.applyFilters();
    }

    // Filters execution matching criteria
    applyFilters() {
        this.filteredAccounts = this.data.filter(acc => {
            const matchesName = this.searchKey ? acc.Name?.toLowerCase().includes(this.searchKey) : true;
            const matchesEmail = this.emailSearchKey ? acc.Email__c?.toLowerCase().includes(this.emailSearchKey) : true;
            const matchesType = this.chosenType ? acc.Type === this.chosenType : true;
            return matchesName && matchesEmail && matchesType;
        });
    }

    // Capture direct change when a user clicks any type selection dropdown box
    handleInlineTypeChange(event) {
        const recordId = event.target.dataset.id;
        const selectedValue = event.target.value;

        // Immediately update local array so the selection stays visible on screen
        this.data = this.data.map(acc => {
            if (acc.Id === recordId) {
                return { ...acc, Type: selectedValue };
            }
            return acc;
        });
        this.applyFilters();

        // Queue change in transactional dirty data collection map
        this.draftValues[recordId] = {
            fields: {
                Id: recordId,
                Type: selectedValue
            }
        };

        this.showSaveButton = Object.keys(this.draftValues).length > 0;
    }

    // Commit changes upstream to Salesforce database via Standard UI API
    async handleSave() {
        const recordInputs = Object.values(this.draftValues);
        if (recordInputs.length === 0) return;

        const promises = recordInputs.map(recordInput => updateRecord(recordInput));
        
        try {
            await Promise.all(promises);
            this.showToast('Success', 'Account record updates saved successfully!', 'success');
            
            // Wipe operational cache trackers
            this.draftValues = {};
            this.showSaveButton = false;
            
            // Force dynamic background server data stream component layout updates
            await refreshApex(this.wiredAccountsResult);
        } catch (error) {
            this.showToast('Error saving data', error.body.message, 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}