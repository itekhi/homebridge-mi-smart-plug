import {
	AccessoryConfig,
	AccessoryPlugin,
	API,
	CharacteristicEventTypes,
	CharacteristicGetCallback,
	CharacteristicSetCallback,
	CharacteristicValue,
	HAP,
	HAPStatus,
	Logging,
	Service
} from "homebridge";
import isIP from 'validator/lib/isIP';
import isMD5 from 'validator/lib/isMD5';
import {MiPlug} from "./mi-plug";

let hap: HAP;

export = (api: API) => {
	hap = api.hap;
	api.registerAccessory("MiSmartPlug", MiSmartPlugAccessory);
};

class MiSmartPlugAccessory implements AccessoryPlugin {
	private readonly name: string;
	private readonly ip: string;
	private readonly token: string;
	private readonly device: MiPlug;
	private readonly validity: boolean;

	private readonly switchService: Service;
	private readonly informationService: Service;

	constructor(private log: Logging, private config: AccessoryConfig, api: API) {
		this.name = config.name;
		this.ip = config.ip;
		this.token = config.token;
		this.device = new MiPlug(this.ip, this.token);
		this.validity = this.validate(this.ip, this.token);

		this.switchService = new hap.Service.Switch(this.name);
		this.switchService.getCharacteristic(hap.Characteristic.On)
			.onGet(this.handleGet.bind(this))
			.onSet(this.handleSet.bind(this));

		this.informationService = new hap.Service.AccessoryInformation()
			.setCharacteristic(hap.Characteristic.Manufacturer, config.manufacturer || "Xiaomi")
			.setCharacteristic(hap.Characteristic.Model, config.model || "ZNCZ05CM");

		log.info('Initialization finished');
	}

	handleGet = async (): Promise<any> => {
		if (!this.validity) {
			this.validate(this.ip, this.token);
			return;
		}

		return await this.device.get()
			.then((power) => {
				this.log.info(`Current state ${power ? "ON" : "OFF"}`);
				return power;
			})
	}

	handleSet = async (value: CharacteristicValue): Promise<any> => {
		if (!this.validity) {
			this.validate(this.ip, this.token);
			return;
		}

		return await this.device.set(value as boolean)
			.then((result) => {
				this.log.info(`Switch state was set to: ${result}`);
			})
			.catch((e: Error) => {
				this.log.error(e.message);
				throw e;
			});
	}

	validate(ip: string, token: string): boolean {
		const isValidIp = isIP(ip, 4);
		const isValidToken = isMD5(token);
		if (!isValidIp) this.log.error('The given ip address is not valid');
		if (!isValidToken) this.log.error('The given token is not valid');
		return isValidIp && isValidToken;
	}

	getServices(): Service[] {
		return [
			this.informationService,
			this.switchService,
		];
	}

}
